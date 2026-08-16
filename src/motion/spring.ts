/**
 * A spring, parameterised the way Apple's designers think about one.
 *
 * Not mass/stiffness/damping — two numbers:
 *
 *   damping   the damping *ratio*. 1.0 is critically damped: it reaches the
 *             target and stops. Below 1.0 it overshoots and oscillates; lower
 *             is bouncier. Above 1.0 it crawls in without ever reaching.
 *   response  roughly how long it takes to get there, in seconds. This is not
 *             a duration — a spring has no fixed duration. Settle time falls
 *             out of the two parameters together, and a spring that is
 *             re-targeted mid-flight has no notion of "how far through" it is.
 *
 * Why a spring rather than a CSS transition, everywhere a finger can reach:
 *
 *   A transition has a duration and an end value baked in at the moment it
 *   starts. Interrupt it and the browser's only move is to start a *new*
 *   transition from wherever the old one had got to — at zero velocity. The
 *   element stops dead and sets off again, and that discontinuity is what an
 *   interface feels like when it is arguing with you rather than following
 *   you. A spring carries position *and* velocity, so re-targeting it mid-
 *   flight is continuous: the motion bends toward the new target instead of
 *   restarting at it.
 *
 * The integration is analytic rather than stepped, so the result does not
 * depend on frame rate — the same gesture settles identically at 60Hz and at
 * 120Hz, and a dropped frame produces a longer step rather than a wrong one.
 */

export interface SpringConfig {
  /** Damping ratio. 1 = critically damped (no overshoot). */
  damping: number;
  /** Seconds to reach the target, roughly. Lower is snappier. */
  response: number;
  /** Settle threshold, in value units. */
  restDelta?: number;
  /** Settle threshold for velocity, in value units per second. */
  restVelocity?: number;
}

/**
 * The house spring table. These are the values Apple ships for the equivalent
 * interactions, and the reason there are five rather than one:
 *
 * `default` is critically damped because most motion in an interface has no
 * momentum behind it — a panel that merely appeared has nothing to overshoot
 * *with*, and bounce on it reads as the interface being pleased with itself.
 *
 * `bouncy` and `sheet` are the exceptions, and both are momentum interactions:
 * something the member flicked, threw or dragged and let go of. Overshoot
 * there is the physical world finishing the gesture they started.
 */
export const SPRINGS = {
  /** Everything, unless there is a reason. */
  default: { damping: 1, response: 0.35 },
  /** Small, local, must not feel deliberate — a toggle knob, an indicator. */
  snappy: { damping: 1, response: 0.25 },
  /** Large surfaces repositioning, where a fast move would read as a jump. */
  gentle: { damping: 1, response: 0.5 },
  /** Momentum only: a flick, a throw, a drag release. */
  bouncy: { damping: 0.8, response: 0.4 },
  /** Sheets and drawers settling to a detent. */
  sheet: { damping: 0.82, response: 0.32 },
} as const satisfies Record<string, SpringConfig>;

export type SpringName = keyof typeof SPRINGS;

const DEFAULT_REST_DELTA = 0.01;
const DEFAULT_REST_VELOCITY = 0.1;

/**
 * Analytic solution of m·x'' + c·x' + k·x = 0 for the three damping regimes,
 * advanced by `dt` seconds. `x` is displacement *from the target*, so the
 * target is always the origin and re-targeting is a subtraction.
 */
function step(
  x: number,
  v: number,
  omega: number,
  zeta: number,
  dt: number,
): [number, number] {
  if (zeta < 1) {
    // Underdamped — overshoots and rings down.
    const omegaD = omega * Math.sqrt(1 - zeta * zeta);
    const e = Math.exp(-zeta * omega * dt);
    const c1 = x;
    const c2 = (v + zeta * omega * x) / omegaD;
    const cos = Math.cos(omegaD * dt);
    const sin = Math.sin(omegaD * dt);
    const nx = e * (c1 * cos + c2 * sin);
    const nv =
      e *
      (-zeta * omega * (c1 * cos + c2 * sin) + omegaD * (c2 * cos - c1 * sin));
    return [nx, nv];
  }

  if (zeta === 1) {
    // Critically damped — the fastest approach with no overshoot at all.
    const e = Math.exp(-omega * dt);
    const c1 = x;
    const c2 = v + omega * x;
    const nx = e * (c1 + c2 * dt);
    const nv = e * (c2 - omega * (c1 + c2 * dt));
    return [nx, nv];
  }

  // Overdamped — two real roots, no oscillation, slow tail.
  const root = Math.sqrt(zeta * zeta - 1);
  const r1 = omega * (-zeta + root);
  const r2 = omega * (-zeta - root);
  const c2 = (v - r1 * x) / (r2 - r1);
  const c1 = x - c2;
  const e1 = Math.exp(r1 * dt);
  const e2 = Math.exp(r2 * dt);
  return [c1 * e1 + c2 * e2, c1 * r1 * e1 + c2 * r2 * e2];
}

/* ---------------------------------------------------------------------------
   One shared frame clock.

   Every spring on the page ticks from a single requestAnimationFrame rather
   than each holding its own. Two reasons: a page mid-gesture can easily have
   half a dozen live springs (a sheet, its scrim, an indicator, two list rows)
   and one callback that walks a Set is cheaper than six that each schedule
   the next frame; and they then all read the *same* timestamp, so springs that
   are supposed to move together cannot drift apart by a frame.
--------------------------------------------------------------------------- */
type Ticker = (dt: number) => void;
const ticking = new Set<Ticker>();
let frame = 0;
let last = 0;

function tick(now: number) {
  // Clamp the step. A backgrounded tab resumes with a multi-second gap, and
  // integrating that in one go teleports every spring on the page.
  const dt = Math.min((now - last) / 1000, 1 / 30);
  last = now;
  for (const fn of [...ticking]) fn(dt);
  frame = ticking.size ? requestAnimationFrame(tick) : 0;
}

function subscribe(fn: Ticker) {
  ticking.add(fn);
  if (!frame && typeof requestAnimationFrame === "function") {
    last = performance.now();
    frame = requestAnimationFrame(tick);
  }
}

function unsubscribe(fn: Ticker) {
  ticking.delete(fn);
  if (!ticking.size && frame) {
    cancelAnimationFrame(frame);
    frame = 0;
  }
}

/**
 * True when the member has asked for reduced motion. Read live rather than
 * cached at import: the preference can change while the page is open, and a
 * session that started before somebody turned it on should honour it too.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export interface SpringOptions extends Partial<SpringConfig> {
  /** Called every frame with the current value. */
  onChange?: (value: number) => void;
  /** Called once when the spring settles. Not called if it is re-targeted. */
  onRest?: (value: number) => void;
}

export class Spring {
  private current: number;
  private target: number;
  private v = 0;
  private cfg: SpringConfig;
  private running = false;
  private readonly onChange?: (value: number) => void;
  private readonly onRest?: (value: number) => void;
  private readonly ticker: Ticker;

  constructor(initial: number, options: SpringOptions = {}) {
    const { onChange, onRest, ...cfg } = options;
    this.current = initial;
    this.target = initial;
    this.onChange = onChange;
    this.onRest = onRest;
    this.cfg = {
      damping: cfg.damping ?? SPRINGS.default.damping,
      response: cfg.response ?? SPRINGS.default.response,
      restDelta: cfg.restDelta ?? DEFAULT_REST_DELTA,
      restVelocity: cfg.restVelocity ?? DEFAULT_REST_VELOCITY,
    };
    this.ticker = (dt) => this.advance(dt);
  }

  /** The live on-screen value. This is what an interruption must start from. */
  get value(): number {
    return this.current;
  }

  /** Current velocity, in value units per second. */
  get velocity(): number {
    return this.v;
  }

  get isAnimating(): boolean {
    return this.running;
  }

  /**
   * Jump. No animation, no velocity — for setting an initial position or
   * for tracking a finger, where the pointer *is* the animation and a spring
   * between the two would only add lag to a 1:1 drag.
   */
  set(value: number, velocity = 0) {
    this.stop();
    this.current = value;
    this.target = value;
    this.v = velocity;
    this.onChange?.(value);
  }

  /** Update position without stopping — for feeding a drag into a live spring. */
  nudge(value: number) {
    this.current = value;
    this.onChange?.(value);
  }

  /**
   * Animate to `target`.
   *
   * The two things that make this feel like Apple's rather than like a
   * tweening library:
   *
   * 1. It starts from `this.current` — the *presentation* value, what is
   *    actually on screen — never from the logical target of whatever
   *    animation it is interrupting. Starting from the logical value is what
   *    produces the visible jump on a fast double-tap.
   *
   * 2. Velocity is carried, not reset. Re-targeting mid-flight keeps whatever
   *    the element was already doing, so a reversal bends the path rather
   *    than hitting a wall and setting off the other way from a standstill.
   *    Passing an explicit `velocity` is the gesture handoff: the release
   *    velocity of the finger becomes the spring's initial velocity, and
   *    there is then no seam between dragging and animating.
   */
  to(target: number, options: { velocity?: number } = {}) {
    if (options.velocity !== undefined) this.v = options.velocity;
    this.target = target;

    // Reduced motion is not "no feedback" — it is no *vestibular* motion. The
    // value still changes and everything downstream still updates; it simply
    // arrives rather than travels. Callers layering an opacity cross-fade on
    // top get the gentler equivalent for free.
    if (prefersReducedMotion()) {
      this.current = target;
      this.v = 0;
      this.stop();
      this.onChange?.(target);
      this.onRest?.(target);
      return;
    }

    if (!this.running) {
      this.running = true;
      subscribe(this.ticker);
    }
  }

  /** Change the spring's feel without interrupting it. */
  configure(cfg: Partial<SpringConfig>) {
    this.cfg = { ...this.cfg, ...cfg };
  }

  stop() {
    if (!this.running) return;
    this.running = false;
    this.v = 0;
    unsubscribe(this.ticker);
  }

  /** Stop ticking but keep the current velocity — for handing off to a drag. */
  pause() {
    if (!this.running) return;
    this.running = false;
    unsubscribe(this.ticker);
  }

  destroy() {
    this.running = false;
    unsubscribe(this.ticker);
  }

  private advance(dt: number) {
    const omega = (2 * Math.PI) / this.cfg.response;
    const [x, v] = step(
      this.current - this.target,
      this.v,
      omega,
      this.cfg.damping,
      dt,
    );

    this.current = this.target + x;
    this.v = v;

    if (
      Math.abs(x) < (this.cfg.restDelta ?? DEFAULT_REST_DELTA) &&
      Math.abs(v) < (this.cfg.restVelocity ?? DEFAULT_REST_VELOCITY)
    ) {
      this.current = this.target;
      this.v = 0;
      this.stop();
      this.onChange?.(this.current);
      this.onRest?.(this.current);
      return;
    }

    this.onChange?.(this.current);
  }
}

/**
 * Two independent springs, one per axis.
 *
 * A single spring driven by the 2D *distance* to the target desynchronises the
 * moment X and Y are moving at different speeds — the element curves toward
 * the target along a path nobody asked for, and a flick that was purely
 * horizontal picks up vertical drift. Decomposing is not an optimisation, it
 * is the difference between a correct diagonal and a wrong one.
 */
export class Spring2D {
  readonly x: Spring;
  readonly y: Spring;

  constructor(
    initial: { x: number; y: number },
    options: Omit<SpringOptions, "onChange" | "onRest"> & {
      onChange?: (value: { x: number; y: number }) => void;
      onRest?: (value: { x: number; y: number }) => void;
    } = {},
  ) {
    const { onChange, onRest, ...cfg } = options;
    const emit = () => onChange?.({ x: this.x.value, y: this.y.value });
    const settled = () => {
      if (!this.x.isAnimating && !this.y.isAnimating) {
        onRest?.({ x: this.x.value, y: this.y.value });
      }
    };
    this.x = new Spring(initial.x, { ...cfg, onChange: emit, onRest: settled });
    this.y = new Spring(initial.y, { ...cfg, onChange: emit, onRest: settled });
  }

  get value() {
    return { x: this.x.value, y: this.y.value };
  }

  set(value: { x: number; y: number }) {
    this.x.set(value.x);
    this.y.set(value.y);
  }

  to(target: { x: number; y: number }, velocity?: { x: number; y: number }) {
    this.x.to(target.x, { velocity: velocity?.x });
    this.y.to(target.y, { velocity: velocity?.y });
  }

  destroy() {
    this.x.destroy();
    this.y.destroy();
  }
}
