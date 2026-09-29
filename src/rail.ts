/**
 * The rail's collapse state, for `CanFrame layout="rail"`.
 *
 * The state lives on `<html data-rail>`, not in the component: page content
 * outside the Vue island reads `--rail-current` from `frame.css`.
 * `RailScript.astro` writes it before first paint.
 *
 * Three values. `collapsed` / `expanded` are the member's choice. `auto` means
 * no choice yet: CSS decides by width (collapsed 768–1151px) and publishes the
 * answer as `--rail-auto`.
 */

export type RailState = "collapsed" | "expanded";
export type RailSetting = RailState | "auto";

/** Kept from can-efb so stored choices survive. RailScript repeats it. */
export const RAIL_STORAGE_KEY = "efb.rail";

/** The `data-rail` value for a stored preference. */
export function initialRail(stored: string | null | undefined): RailSetting {
  return stored === "collapsed" || stored === "expanded" ? stored : "auto";
}

/** Whether the rail is collapsed now, from `data-rail` and `--rail-auto`. */
export function effectiveRail(
  dataRail: string | undefined,
  autoValue: string,
): RailState {
  if (dataRail === "collapsed" || dataRail === "expanded") return dataRail;
  return autoValue.trim() === "collapsed" ? "collapsed" : "expanded";
}

/** Reads the document. Browser only. */
export function currentRail(): RailState {
  const root = document.documentElement;
  return effectiveRail(
    root.dataset.rail,
    getComputedStyle(root).getPropertyValue("--rail-auto"),
  );
}

/** Writes `data-rail` and stores the choice. Browser only. */
export function setRail(next: RailState): void {
  document.documentElement.dataset.rail = next;
  try {
    localStorage.setItem(RAIL_STORAGE_KEY, next);
  } catch {
    // Private mode throws. The choice holds for this page view.
  }
}
