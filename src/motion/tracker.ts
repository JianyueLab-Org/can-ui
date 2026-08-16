/**
 * Pointer velocity, measured over a short history rather than from the last
 * two events.
 *
 * Two consecutive `pointermove` events can be 2ms and half a pixel apart —
 * dividing one by the other gives a number that swings wildly frame to frame,
 * and using it as a spring's initial velocity makes a calm release occasionally
 * fire the element across the screen. Averaging over a window smooths that out.
 *
 * The window is short (~100ms) on purpose. A longer one is steadier but stale:
 * a finger that drags out and stops dead before lifting has zero velocity at
 * release, and the member expects the element to stay put. A 100ms window
 * forgets the outbound travel by then; a 500ms one would still be reporting it
 * and would throw the element away from under them.
 */

const WINDOW_MS = 100;
const MAX_SAMPLES = 12;

interface Sample {
  x: number;
  y: number;
  t: number;
}

export class VelocityTracker {
  private samples: Sample[] = [];

  /** Record a pointer position. `t` defaults to now, in milliseconds. */
  add(x: number, y: number, t: number = performance.now()) {
    this.samples.push({ x, y, t });
    const cutoff = t - WINDOW_MS;
    while (
      this.samples.length > 2 &&
      (this.samples[0]!.t < cutoff || this.samples.length > MAX_SAMPLES)
    ) {
      this.samples.shift();
    }
  }

  /** px per second, per axis, over the window. */
  velocity(): { x: number; y: number } {
    if (this.samples.length < 2) return { x: 0, y: 0 };
    const first = this.samples[0]!;
    const last = this.samples[this.samples.length - 1]!;
    const dt = (last.t - first.t) / 1000;
    // Sub-millisecond windows divide to nonsense; report nothing rather than
    // a number four orders of magnitude too large.
    if (dt <= 0.001) return { x: 0, y: 0 };
    return { x: (last.x - first.x) / dt, y: (last.y - first.y) / dt };
  }

  reset() {
    this.samples = [];
  }
}
