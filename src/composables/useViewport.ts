/**
 * The on-screen keyboard, as a CSS variable.
 *
 * The problem: a dialog anchored to the bottom of the screen — which is what
 * every dialog in this system becomes on a phone — is *covered by the
 * keyboard* the moment somebody taps a field inside it. The member is typing
 * into a form they cannot see, and the buttons that submit it are somewhere
 * under the keyboard.
 *
 * It happens because `position: fixed` resolves against the **layout**
 * viewport, and the keyboard does not resize the layout viewport. It resizes
 * the *visual* viewport — the part actually on screen — and nothing in CSS is
 * told about that. Chrome offers `interactive-widget=resizes-content` in the
 * viewport meta, which fixes it there; Safari does not implement it, and
 * Safari is most of the phones on this network.
 *
 * So the difference is measured and published as `--keyboard-inset`, which
 * overlays use as bottom padding. When no keyboard is up it is `0px` and
 * everything behaves exactly as before.
 *
 * Installed once per document, lazily, and never removed — it is a single
 * passive listener on an API that exists precisely for this, and the
 * alternative is every overlay installing its own.
 */

let installed = false;

export function watchViewportInsets() {
  if (installed || typeof window === "undefined") return;
  const vv = window.visualViewport;
  if (!vv) return;
  installed = true;

  let frame = 0;

  const update = () => {
    frame = 0;
    // How much of the layout viewport is hidden at the bottom: the keyboard,
    // plus whatever browser chrome overlaps it. `offsetTop` matters when the
    // page has been scrolled up to reveal a focused field — without it the
    // inset is overstated by exactly that scroll and the panel jumps too high.
    const hidden = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    // Rounded, and only written when it actually changes: this fires on every
    // frame of the keyboard's own animation, and setting a custom property
    // invalidates style for the whole document each time.
    const next = `${Math.round(hidden)}px`;
    const root = document.documentElement;
    if (root.style.getPropertyValue("--keyboard-inset") !== next) {
      root.style.setProperty("--keyboard-inset", next);
    }
  };

  const schedule = () => {
    if (frame) return;
    frame = requestAnimationFrame(update);
  };

  vv.addEventListener("resize", schedule, { passive: true });
  vv.addEventListener("scroll", schedule, { passive: true });
  update();
}
