import { onScopeDispose, readonly, ref, type Ref } from "vue";

/**
 * A media query as a reactive boolean, live for the life of the page.
 *
 * Read live rather than sampled once at import. All three preferences below
 * can change while a page is open — a member turns reduced motion on because
 * something on *this* page made them queasy — and a session that started
 * before the change should honour it too.
 */
export function useMediaQuery(query: string): Readonly<Ref<boolean>> {
  const matches = ref(false);

  if (typeof window !== "undefined" && window.matchMedia) {
    const mql = window.matchMedia(query);
    matches.value = mql.matches;
    const onChange = (event: MediaQueryListEvent) => {
      matches.value = event.matches;
    };
    mql.addEventListener("change", onChange);
    onScopeDispose(() => mql.removeEventListener("change", onChange));
  }

  return readonly(matches);
}

/**
 * No *vestibular* motion — not no feedback. Components read this to swap a
 * slide or a spring for a short cross-fade, and to drop overshoot entirely,
 * while keeping the opacity and colour changes that carry the meaning.
 */
export function useReducedMotion() {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/**
 * Frost the glass: raise the material's opacity to near-solid and drop the
 * blur. Handled in CSS for the static case; components read it when the
 * decision is structural — a sheet that would otherwise let the page show
 * through behind a form.
 */
export function useReducedTransparency() {
  return useMediaQuery("(prefers-reduced-transparency: reduce)");
}

/** Solid backgrounds and a defined border on anything separated by a tint. */
export function useHighContrast() {
  return useMediaQuery("(prefers-contrast: more)");
}

/**
 * The primary input is a finger.
 *
 * Gated on the input device rather than a width breakpoint, because that is
 * what the question actually is: a 1024px iPad needs the touch treatment and a
 * 375px desktop window does not.
 */
export function useCoarsePointer() {
  return useMediaQuery("(pointer: coarse)");
}
