import { onScopeDispose, ref, watch, type Ref } from "vue";
import { watchViewportInsets } from "./useViewport";

/**
 * Shared behaviour for every overlay surface — dialog, sheet, drawer, popover,
 * command palette.
 *
 * Without it an overlay is a `v-if` div: opening one leaves focus behind on
 * the trigger, Tab walks straight out of the panel into the page underneath,
 * the body keeps scrolling behind the backdrop, and Escape does nothing.
 * Keyboard and screen-reader users cannot tell they are in a dialog, let alone
 * get out of one. That is not a polish item — it is the difference between the
 * overlay being usable and not.
 *
 * Two things it handles that a hand-rolled copy will not:
 *
 * **Mounted already open.** The wiring runs `immediate`, so an overlay whose
 * ref is `true` on its first render gets the trap, the lock and the focus move
 * like any other. A watcher without `immediate` silently skips all of it, and
 * the call site's only clue is that Tab escapes — which is why the one dialog
 * that knew about it flipped its own ref in `onMounted` to work around it.
 *
 * **Nesting.** The scroll lock is reference-counted. A sheet opened from
 * inside a dialog would otherwise restore `overflow` when *it* closes and let
 * the page scroll behind the dialog that is still open.
 *
 * Usage:
 *   const open = ref(false)
 *   const panel = useOverlay(open)
 *   <div v-if="open" ref="panel" role="dialog" aria-modal="true">…</div>
 */

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

/* ---------------------------------------------------------------------------
   Body scroll lock.

   `overflow: hidden` on <html> is the textbook answer and it **does not work
   on iOS Safari**. The page keeps scrolling behind the backdrop, and worse, it
   rubber-bands: a member dragging a sheet on a phone drags the whole page
   around underneath it. That is the single most obvious way a web overlay
   announces that it is a web overlay.

   What does work is taking the body out of flow — `position: fixed` with a
   negative `top` equal to the current scroll — and putting the scroll position
   back on release. The cost is that it has to be *put back*, because a fixed
   body has forgotten where it was; forgetting that step sends the member to
   the top of the page every time they close a dialog, which is a worse bug
   than the one being fixed.

   Both techniques are applied. On a desktop browser the html rule is what
   takes effect and the body rule is inert; on iOS it is the other way round.
   Feature-detecting between them would mean guessing which engine is lying
   about what, and the pair costs four style properties.

   Reference-counted: a sheet opened from inside a dialog must not unlock the
   page when only the sheet closes.
--------------------------------------------------------------------------- */

let lockCount = 0;
let previousOverflow = "";
let restoreScrollY = 0;

function lockBody() {
  if (typeof document === "undefined") return;
  if (lockCount === 0) {
    const html = document.documentElement;
    const body = document.body;

    restoreScrollY = window.scrollY;
    previousOverflow = html.style.overflow;

    html.style.overflow = "hidden";
    // Hold the scrollbar's width so locking does not shift the whole page
    // sideways by 15px — which reads as the overlay knocking the content out
    // of the way rather than settling over it.
    html.style.scrollbarGutter = "stable";

    body.style.position = "fixed";
    body.style.top = `-${restoreScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    // Without this the body collapses to its content width the moment it
    // leaves flow, and a centred layout jumps left as the overlay opens.
    body.style.width = "100%";
  }
  lockCount += 1;
}

function unlockBody() {
  if (typeof document === "undefined") return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    const html = document.documentElement;
    const body = document.body;

    html.style.overflow = previousOverflow;
    html.style.scrollbarGutter = "";

    body.style.position = "";
    body.style.top = "";
    body.style.left = "";
    body.style.right = "";
    body.style.width = "";

    // Instant, not smooth: `html { scroll-behavior: smooth }` is set globally,
    // and animating back to where the member already was reads as the page
    // sliding for no reason. This is a restoration, not a navigation.
    window.scrollTo({
      top: restoreScrollY,
      behavior: "instant" as ScrollBehavior,
    });
  }
}

export interface UseOverlayOptions {
  /** Focus this element on open instead of the first focusable child. */
  initialFocus?: Ref<HTMLElement | HTMLInputElement | null | undefined>;
  /** Skip the body scroll lock — correct for a non-modal popover. */
  lockScroll?: boolean;
  /** Skip the focus trap — also for non-modal surfaces. */
  trapFocus?: boolean;
  /**
   * Escape dismisses. Pass `false` — or a getter, when it is a reactive prop —
   * for a decision that must be answered rather than walked away from.
   */
  dismissible?: boolean | (() => boolean);
}

interface KeyboardOverlay {
  accepts: (key: string) => boolean;
  onKeydown: (event: KeyboardEvent) => void;
}

interface KeyboardStack {
  overlays: KeyboardOverlay[];
  onKeydown: (event: KeyboardEvent) => void;
}

const keyboardStacks = new WeakMap<Document, KeyboardStack>();

function registerKeyboardOverlay(doc: Document, overlay: KeyboardOverlay) {
  let stack = keyboardStacks.get(doc);
  if (!stack) {
    const overlays: KeyboardOverlay[] = [];
    const onKeydown = (event: KeyboardEvent) => {
      // Select once: closing the winner must not send this same key to the
      // overlay below it, even when its reactive close runs synchronously.
      for (let index = overlays.length - 1; index >= 0; index -= 1) {
        const candidate = overlays[index]!;
        if (!candidate.accepts(event.key)) continue;
        candidate.onKeydown(event);
        return;
      }
    };
    stack = { overlays, onKeydown };
    keyboardStacks.set(doc, stack);
    doc.addEventListener("keydown", onKeydown, true);
  }
  const active = stack;
  active.overlays.push(overlay);
  return () => {
    const index = active.overlays.indexOf(overlay);
    if (index !== -1) active.overlays.splice(index, 1);
    if (active.overlays.length) return;
    doc.removeEventListener("keydown", active.onKeydown, true);
    keyboardStacks.delete(doc);
  };
}

export function useOverlay(
  isOpen: Ref<boolean>,
  options: UseOverlayOptions = {},
) {
  const {
    lockScroll = true,
    trapFocus = true,
    dismissible = true,
    initialFocus,
  } = options;
  const container = ref<HTMLElement | null>(null);
  const activation = ref(0);
  let previouslyFocused: HTMLElement | null = null;
  let wired = false;
  let removeKeyboard: (() => void) | undefined;

  const canDismiss = () =>
    typeof dismissible === "function" ? dismissible() : dismissible;

  function focusables(): HTMLElement[] {
    if (!container.value) return [];
    return [...container.value.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
      (el) => el.offsetParent !== null || el === document.activeElement,
    );
  }

  function onKeydown(event: KeyboardEvent) {
    if (!isOpen.value) return;

    if (event.key === "Escape" && canDismiss()) {
      // The document coordinator has already selected the top eligible overlay.
      event.stopPropagation();
      isOpen.value = false;
      return;
    }

    if (!trapFocus || event.key !== "Tab") return;

    const items = focusables();
    if (!items.length) {
      // Nothing focusable inside: keep focus on the panel rather than letting
      // it escape to the page behind the backdrop.
      event.preventDefault();
      container.value?.focus();
      return;
    }

    const first = items[0]!;
    const last = items[items.length - 1]!;
    const active = document.activeElement as HTMLElement | null;

    if (
      event.shiftKey &&
      (active === first || !container.value?.contains(active))
    ) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const keyboard: KeyboardOverlay = {
    accepts: (key) =>
      wired &&
      isOpen.value &&
      !!container.value?.isConnected &&
      (key === "Escape" ? canDismiss() : key === "Tab" && trapFocus),
    onKeydown,
  };

  watch(
    isOpen,
    (open) => {
      if (typeof document === "undefined") return;

      if (open) {
        if (wired) return;
        wired = true;
        activation.value += 1;
        // Idempotent. Installed here because every overlay in the system goes
        // through useOverlay, and an overlay is the only thing that cares
        // whether the on-screen keyboard is up.
        watchViewportInsets();
        previouslyFocused = document.activeElement as HTMLElement | null;
        if (lockScroll) lockBody();
        removeKeyboard = registerKeyboardOverlay(document, keyboard);
      } else {
        // Guard on `wired` so the immediate run of a closed overlay does not
        // unbalance the lock counter or steal focus from the page.
        if (!wired) return;
        wired = false;
        if (lockScroll) unlockBody();
        removeKeyboard?.();
        removeKeyboard = undefined;
        // Return the caret to whatever opened the overlay.
        previouslyFocused?.focus?.();
        previouslyFocused = null;
      }
    },
    { immediate: true, flush: "sync" },
  );

  // Activation is synchronous, before Vue queues the panel's render. Move
  // focus after that render (including template refs), not via nextTick from
  // the sync watcher, which can run before the render has even been queued.
  watch(
    [activation, container],
    ([, panel]) => {
      if (!isOpen.value || typeof document === "undefined" || !wired) return;
      if (!panel?.isConnected) return;
      if (keyboardStacks.get(document)?.overlays.at(-1) !== keyboard) return;
      const target = initialFocus?.value ?? focusables()[0];
      target?.focus();
    },
    { flush: "post" },
  );

  onScopeDispose(() => {
    if (!wired) return;
    wired = false;
    if (lockScroll) unlockBody();
    removeKeyboard?.();
    removeKeyboard = undefined;
  });

  return container;
}
