import { readonly, ref, type Ref } from "vue";
import { prefersReducedMotion } from "../motion/spring";

/**
 * The theme: three modes, one source of truth, one set of listeners.
 *
 * **There are three modes, not two.** `light`, `dark`, and `system` — and the
 * third one is the default, not an afterthought. A two-state toggle has a
 * trapdoor in it: the first tap writes a preference that can never be taken
 * back, so a member who once tried dark mode is pinned to it forever while
 * their phone goes on switching at sunset around them. Every platform this
 * interface imitates offers Light / Dark / Automatic, and it offers Automatic
 * because it is the one most people want.
 *
 * `system` is stored as **the absence of a stored value**, which keeps it
 * compatible with the `theme` key can-web already writes and makes "reset to
 * automatic" a `removeItem` rather than a third magic string to parse.
 *
 * **The `dark` class on `<html>` stays the source of truth for what is on
 * screen.** It is the only thing a server-rendered page and a hydrated island
 * can both see, and this network is Astro — most of every page never becomes
 * Vue at all. `mode` is the member's *choice*; `isDark` is what is actually
 * rendered. They are different questions: in `system` mode the choice does not
 * change at sunset but the rendering does.
 *
 * Everything is installed once per document and shared. Three components on a
 * page — a Logo, a ThemeToggle, a ThemeLangControls — used to mean three
 * MutationObservers watching the same attribute.
 *
 * SSR-safe: the refs below are module-level, but nothing on the server ever
 * writes them (every mutation is behind a `document` check), so there is no
 * per-request state to leak between renders.
 */

export type ThemeMode = "light" | "dark" | "system";

const STORAGE_KEY = "theme";

const isDarkRef = ref(false);
const modeRef = ref<ThemeMode>("system");
let installed = false;

/** Read the stored choice. Anything unrecognised means "follow the system". */
function readMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : "system";
  } catch {
    // Private mode throws on localStorage. Following the system is the right
    // fallback: it is what somebody who has expressed no preference wants.
    return "system";
  }
}

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** What a mode resolves to right now. */
export function resolveMode(mode: ThemeMode): boolean {
  return mode === "system" ? systemPrefersDark() : mode === "dark";
}

/** Write the theme to the document. Everything else in the app follows. */
export function applyTheme(dark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", dark);
  // Kept in step so the chrome the browser paints itself — form controls, the
  // canvas between navigations, scrollbar gutters — swaps with the page rather
  // than a frame later.
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

function install() {
  if (installed || typeof document === "undefined") return;
  installed = true;

  const root = document.documentElement;
  isDarkRef.value = root.classList.contains("dark");
  modeRef.value = readMode();

  // One observer for the whole document. The class can be changed by things
  // that are not Vue at all — the no-flash inline script on first paint, and a
  // view transition's snapshot callback — so watching the DOM catches every
  // one of them where a shared ref would not.
  new MutationObserver(() => {
    isDarkRef.value = root.classList.contains("dark");
  }).observe(root, { attributes: true, attributeFilter: ["class"] });

  // Follow the system while nobody has overridden it. Without this, a member
  // in `system` mode whose phone goes dark at sunset keeps a light page until
  // they navigate — the preference is honoured once, at load, and then
  // silently ignored for as long as the tab stays open.
  if (window.matchMedia) {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", (event) => {
        if (modeRef.value === "system") applyTheme(event.matches);
      });
  }

  // Other tabs. `storage` fires only in the tabs that did *not* make the
  // change, which is exactly the set that needs telling — two tabs of the same
  // site disagreeing about the theme reads as one of them being broken.
  window.addEventListener("storage", (event) => {
    if (event.key !== null && event.key !== STORAGE_KEY) return;
    modeRef.value = readMode();
    applyTheme(resolveMode(modeRef.value));
  });
}

/**
 * The theme as reactive state.
 *
 * `mode` is the member's choice; `isDark` is what is on screen. Read `isDark`
 * to decide what to *render* (which logo, which icon) and `mode` to show which
 * option is selected.
 */
export function useTheme() {
  install();
  return {
    mode: readonly(modeRef),
    isDark: readonly(isDarkRef),
    setMode: setThemeMode,
    cycle: cycleTheme,
  };
}

/** Just the rendered state — for a logo or an icon that has to match it. */
export function useIsDark(): Readonly<Ref<boolean>> {
  install();
  return readonly(isDarkRef);
}

/** The member's stored choice, including `system`. */
export function useThemeMode(): Readonly<Ref<ThemeMode>> {
  install();
  return readonly(modeRef);
}

function storeMode(mode: ThemeMode) {
  try {
    if (mode === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // Storage refused. The mode still applies for this page; only the memory
    // of it is lost, and that is not worth interrupting a click for.
  }
}

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

/**
 * Set the mode, and — when the change came from a pointer — reveal it with a
 * circular wipe out of the control that was pressed.
 *
 * The wipe is the browser's own view-transition machinery, not a library: the
 * new document state is snapshotted, then `::view-transition-new(root)` is
 * clipped from a zero-radius circle at the cursor out to whichever corner is
 * furthest away. `motion.css` suppresses the default cross-fade underneath it
 * via `html.theme-transitioning`, and — the part that is easy to miss —
 * suppresses `body`'s own colour transition for the duration. A running CSS
 * transition means the *new* snapshot is taken before the colours have moved,
 * so the wipe would reveal the old palette and the real one would pop in
 * afterwards.
 *
 * **The preference is persisted before the animation, never after.** If the
 * transition is interrupted — a nav click mid-wipe, the tab going to the
 * background — the choice is already committed and the next page loads the
 * right theme.
 *
 * Three cases fall back to an instant swap, and each is the *correct* outcome
 * rather than a degraded one:
 *
 *   - no `startViewTransition` (Safari, Firefox at time of writing);
 *   - no cursor position — keyboard or screen-reader activation, where
 *     `clientX` is 0 and a wipe from the top-left corner would be a lie about
 *     where the press came from;
 *   - reduced motion.
 *
 * The reduced-motion case is still *eased*, not snapped: `motion.css` keeps a
 * short colour cross-fade alive for exactly this. A full-viewport brightness
 * jump is one of the specific things that preference asks us to stop doing, so
 * removing the animation entirely would be reading it backwards.
 */
export function setThemeMode(mode: ThemeMode, event?: MouseEvent): boolean {
  const dark = resolveMode(mode);
  modeRef.value = mode;
  storeMode(mode);

  if (typeof document === "undefined") return dark;

  const doc = document as ViewTransitionDoc;
  const x = event?.clientX ?? 0;
  const y = event?.clientY ?? 0;

  if (!doc.startViewTransition || !x || prefersReducedMotion()) {
    applyTheme(dark);
    return dark;
  }

  // Has to reach the furthest corner, or the old theme is left in a wedge at
  // the far edge for the length of the animation.
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  document.documentElement.classList.add("theme-transitioning");

  const transition = doc.startViewTransition(() => applyTheme(dark));

  transition.ready
    .then(() => {
      document.documentElement.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${endRadius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 480,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          pseudoElement: "::view-transition-new(root)",
        },
      );
    })
    .catch(() => {});

  // `.catch` rather than a bare `.finally`: a second toggle while the first is
  // still running aborts it, and `finished` then *rejects*. Without a handler
  // that is an unhandled rejection in the console every time somebody taps
  // twice — and the class would be left on the element, killing the next wipe.
  transition.finished
    .catch(() => {})
    .finally(() => {
      document.documentElement.classList.remove("theme-transitioning");
    });

  return dark;
}

/**
 * light → dark → system → light.
 *
 * A cycle rather than a menu because this lives in a header next to five other
 * controls, and the common action — "make it dark, now" — has to stay one tap.
 * The order puts the two explicit choices first so that first tap always
 * flips the appearance, and `system` last, where somebody looking for it will
 * find it by continuing to press.
 */
export function cycleTheme(event?: MouseEvent): ThemeMode {
  const next: ThemeMode =
    modeRef.value === "light"
      ? "dark"
      : modeRef.value === "dark"
        ? "system"
        : "light";
  setThemeMode(next, event);
  return next;
}

/** Persist a raw boolean. Kept for callers that only think in light/dark. */
export function storeTheme(dark: boolean) {
  storeMode(dark ? "dark" : "light");
}

/** Back-compat shim for the two-state API this replaced. */
export function toggleTheme(event: MouseEvent, current: boolean): boolean {
  return setThemeMode(current ? "light" : "dark", event);
}

/** The three modes, in the order a picker should offer them. */
export const THEME_MODES: ThemeMode[] = ["light", "dark", "system"];

/** ICON_PATHS key for each mode. */
export const THEME_ICONS: Record<ThemeMode, string> = {
  light: "sun",
  dark: "moon",
  system: "computerDesktop",
};
