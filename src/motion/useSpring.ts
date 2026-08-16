import { onScopeDispose, ref, type Ref } from "vue";
import { Spring, SPRINGS, type SpringConfig, type SpringName } from "./spring";

export interface UseSpringOptions extends Partial<SpringConfig> {
  /** Pick a preset from SPRINGS; explicit damping/response still win. */
  preset?: SpringName;
  onRest?: (value: number) => void;
}

export interface UseSpringReturn {
  /** Reactive current value — bind this into a style. */
  value: Ref<number>;
  /** Animate to a target, optionally handing off a gesture's velocity. */
  to: (target: number, options?: { velocity?: number }) => void;
  /** Jump with no animation. */
  set: (value: number) => void;
  /** Track a pointer 1:1 — updates the value without starting a spring. */
  track: (value: number) => void;
  /** Escape hatch for velocity, interruption and re-configuration. */
  spring: Spring;
}

/**
 * A spring as a reactive value.
 *
 * The value is a plain ref, so it composes with everything Vue already does —
 * bind it into a `:style`, derive a computed from it, watch it. What it is
 * *not* is a CSS transition on a class: the point of the whole exercise is
 * that this value can be re-targeted mid-flight and will bend rather than
 * restart. See spring.ts for why that matters.
 */
export function useSpring(
  initial: number,
  options: UseSpringOptions = {},
): UseSpringReturn {
  const { preset, onRest, ...overrides } = options;
  const base = preset ? SPRINGS[preset] : SPRINGS.default;

  const value = ref(initial);
  const spring = new Spring(initial, {
    damping: overrides.damping ?? base.damping,
    response: overrides.response ?? base.response,
    restDelta: overrides.restDelta,
    restVelocity: overrides.restVelocity,
    onChange: (v) => {
      value.value = v;
    },
    onRest,
  });

  // Tied to the component's scope rather than to onUnmounted, so a spring
  // created inside an effectScope (a composable used by another composable)
  // is still torn down. A live spring holds a slot in the shared rAF loop.
  onScopeDispose(() => spring.destroy());

  return {
    value,
    spring,
    to: (target, opts) => spring.to(target, opts),
    set: (v) => spring.set(v),
    track: (v) => spring.nudge(v),
  };
}
