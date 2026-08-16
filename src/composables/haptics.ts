/**
 * Haptic feedback, where the platform has any.
 *
 * Three rules govern whether a haptic belongs at all, and they are the reason
 * this module is four lines of API rather than a library:
 *
 * **Causality.** It must be obvious what caused it. Fire on the actual causal
 * event — the switch flipping, the sheet snapping home — not on the pointer
 * event that led there, and match its character to the action's physicality.
 *
 * **Harmony.** The visual, the sound and the haptic must land on the *same
 * frame*. A haptic that fires when the gesture ends while the visual is still
 * springing into place reads as two separate events, and the illusion that
 * they are one thing is gone. Call this from the same handler that starts the
 * animation, never from an animation callback.
 *
 * **Utility.** Only for moments that mean something: a commit, a snap, an
 * error. Feedback on everything trains people to ignore all of it, and on a
 * phone it is also a battery cost they did not ask for.
 *
 * Honours `prefers-reduced-motion`: somebody who has asked for less physical
 * motion has not asked for the interface to buzz at them instead. Safari on
 * iOS does not implement the Vibration API at all, so on the platform this
 * design language comes from every one of these calls is a no-op — which is
 * why nothing here may ever be the *only* feedback for an action.
 */
import { prefersReducedMotion } from "../motion/spring";

type Pattern = number | number[];

function fire(pattern: Pattern) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  if (prefersReducedMotion()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // A vibrate() rejected by a permissions policy must not take a gesture
    // handler down with it.
  }
}

export const haptics = {
  /** A control changed state: a switch, a segment, a checkbox. */
  selection: () => fire(8),
  /** Something landed where it was headed: a sheet detent, a snap point. */
  impact: () => fire(12),
  /** An action completed. */
  success: () => fire([10, 40, 16]),
  /** An action was refused. Pairs with the visible error, never replaces it. */
  error: () => fire([14, 60, 14, 60, 14]),
};
