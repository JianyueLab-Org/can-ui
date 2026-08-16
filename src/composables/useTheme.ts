import { onScopeDispose, readonly, ref, type Ref } from "vue";
import { prefersReducedMotion } from "../motion/spring";

/**
 * The theme, as state anything can read and anything can change.
 *
 * The source of truth is the `dark` class on `<html>`, put there before first
 * paint by ThemeScript. That is deliberate and it is not merely convention: it
 * is the only place a *server-rendered* page and a *hydrated island* can both
 * see, and this network is Astro — most of every page never becomes Vue at
 * all. A ref inside one component could not be read by the static markup
 * around it, and two islands each keeping their own copy would disagree the
 * moment one of them toggled.
 *
 * So this observes the class rather than owning it. Anything that needs to
 * react — the logo swapping its wordmark between black and white, a toggle
 * showing sun or moon — reads `useIsDark()` and stays correct no matter which
 * control did the switching.
 */

const STORAGE_KEY = "theme";

/** Write the theme to the document. Everything else in the app follows. */
export function applyTheme(dark: boolean) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("dark", dark);
  // Kept in step so the chrome the browser paints itself — form controls, the
  // canvas between navigations, scrollbar gutters — swaps with the page rather
  // than a frame later.
  document.documentElement.style.colorScheme = dark ? "dark" : "light";
}

/** Persist the preference. Separate from applying it — see `toggleTheme`. */
export function storeTheme(dark: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  } catch {
    // Private mode throws. The theme still applies for this page; only the
    // memory of it is lost, and that is not worth interrupting a click for.
  }
}

/**
 * Is the document currently dark? Live, not sampled.
 *
 * A `MutationObserver` rather than a shared ref because the class can be
 * changed by things that are not Vue at all: the no-flash inline script on
 * first paint, and a view transition's snapshot callback. Watching the DOM
 * catches every one of them.
 */
export function useIsDark(): Readonly<Ref<boolean>> {
  const isDark = ref(false);

  if (typeof document !== "undefined") {
    const read = () =>
      (isDark.value = document.documentElement.classList.contains("dark"));
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    onScopeDispose(() => observer.disconnect());
  }

  return readonly(isDark);
}

type ViewTransitionDoc = Document & {
  startViewTransition?: (cb: () => void) => {
    ready: Promise<void>;
    finished: Promise<void>;
  };
};

/**
 * Swap the theme with a circular wipe out of the control that was pressed.
 *
 * The wipe is the browser's own view-transition machinery, not a library: the
 * new document state is snapshotted, then `::view-transition-new(root)` is
 * clipped from a zero-radius circle at the cursor out to whichever corner is
 * furthest away. `motion.css` suppresses the default cross-fade underneath it
 * via `html.theme-transitioning`, or the two run at once and the wipe is lost
 * behind a plain fade.
 *
 * **The preference is persisted before the animation, never after.** If the
 * transition is interrupted — a nav click mid-wipe, the tab going to the
 * background — the choice is already committed and the next page loads the
 * right theme. Persisting in the `finished` handler loses it exactly when the
 * member was most obviously mid-action.
 *
 * Three cases fall back to the instant swap, and each is the *correct*
 * outcome rather than a degraded one:
 *
 *   - no `startViewTransition` (Safari, Firefox at time of writing);
 *   - no cursor position — keyboard or screen-reader activation, where
 *     `clientX` is 0 and a wipe from the top-left corner would be a lie about
 *     where the press came from;
 *   - reduced motion, where a full-viewport animated brightness change is
 *     precisely what the preference is asking us to stop doing.
 */
export function toggleTheme(event: MouseEvent, current: boolean) {
  const next = !current;
  storeTheme(next);

  const doc = document as ViewTransitionDoc;

  if (!doc.startViewTransition || !event.clientX || prefersReducedMotion()) {
    applyTheme(next);
    return next;
  }

  const x = event.clientX;
  const y = event.clientY;
  // Has to reach the furthest corner, or the old theme is left in a wedge at
  // the far edge for the length of the animation.
  const endRadius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y),
  );

  document.documentElement.classList.add("theme-transitioning");

  const transition = doc.startViewTransition(() => applyTheme(next));

  void transition.ready.then(() => {
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
  });

  void transition.finished.finally(() => {
    document.documentElement.classList.remove("theme-transitioning");
  });

  return next;
}
