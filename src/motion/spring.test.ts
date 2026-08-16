/**
 * The spring solver is the one thing in this repo that can be wrong in a way
 * nobody sees. Every other bug here shows up as a component that looks off;
 * a subtly wrong integration shows up as motion that feels slightly cheap,
 * which is precisely the failure this design language exists to avoid — and
 * nobody files a bug for it.
 *
 * So the physics is asserted rather than eyeballed. The clock is stubbed, so
 * these run headless and deterministically.
 *
 *   bun test
 */
import { describe, expect, test, beforeEach } from "bun:test";

let now = 0;
const queue: FrameRequestCallback[] = [];

globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
  queue.push(cb);
  return queue.length;
}) as typeof requestAnimationFrame;
globalThis.cancelAnimationFrame = (() => {}) as typeof cancelAnimationFrame;
globalThis.performance = { now: () => now } as Performance;

const { Spring, SPRINGS } = await import("./spring");

/** Run a spring to rest against a stubbed clock; return every frame's value. */
function run(
  cfg: { damping: number; response: number },
  from: number,
  to: number,
  velocity = 0,
  hz = 60,
) {
  now = 0;
  queue.length = 0;
  const samples: number[] = [];
  const spring = new Spring(from, { ...cfg, onChange: (x) => samples.push(x) });
  spring.to(to, { velocity });
  const dt = 1000 / hz;
  for (let i = 0; i < hz * 10 && queue.length; i += 1) {
    now += dt;
    for (const cb of queue.splice(0, queue.length)) cb(now);
  }
  return { samples, settledMs: (samples.length / hz) * 1000 };
}

/** |value| at a given time, in seconds. */
const at = (samples: number[], t: number, hz = 60) =>
  Math.abs(samples[Math.round(t * hz) - 1] ?? 0);

beforeEach(() => {
  now = 0;
  queue.length = 0;
});

describe("damping ratio", () => {
  test("1.0 is critically damped — reaches the target and stops", () => {
    const { samples, settledMs } = run(SPRINGS.default, 100, 0);
    expect(Math.min(...samples)).toBeGreaterThanOrEqual(-0.02);
    expect(samples.at(-1)).toBe(0);
    expect(settledMs).toBeLessThan(1100);
  });

  test("below 1.0 overshoots, and lower overshoots further", () => {
    const soft = run({ damping: 0.8, response: 0.4 }, 100, 0);
    const softer = run({ damping: 0.5, response: 0.4 }, 100, 0);
    const overshoot = (s: number[]) => -Math.min(...s);
    expect(overshoot(soft.samples)).toBeGreaterThan(0.5);
    expect(overshoot(softer.samples)).toBeGreaterThan(overshoot(soft.samples));
  });

  test("above 1.0 is overdamped — no overshoot, slower than critical", () => {
    const over = run({ damping: 1.6, response: 0.35 }, 100, 0);
    const critical = run({ damping: 1, response: 0.35 }, 100, 0);
    expect(Math.min(...over.samples)).toBeGreaterThanOrEqual(-0.02);
    expect(over.settledMs).toBeGreaterThan(critical.settledMs);
  });
});

describe("response", () => {
  test("lower response settles sooner", () => {
    const fast = run({ damping: 1, response: 0.2 }, 100, 0);
    const slow = run({ damping: 1, response: 0.6 }, 100, 0);
    expect(fast.settledMs).toBeLessThan(slow.settledMs);
  });

  test("0.35 covers 95% of the travel in roughly 0.35s", () => {
    const { samples } = run({ damping: 1, response: 0.35 }, 100, 0);
    const frames = samples.findIndex((x) => Math.abs(x) < 5);
    const ms = (frames / 60) * 1000;
    expect(ms).toBeGreaterThan(150);
    expect(ms).toBeLessThan(550);
  });
});

describe("velocity handoff", () => {
  test("launched toward the target, it is ahead the whole way", () => {
    const cold = run({ damping: 1, response: 0.35 }, 100, 0, 0);
    const thrown = run({ damping: 1, response: 0.35 }, 100, 0, -400);
    // Compared by position at a fixed time rather than by a threshold
    // crossing: on a 100px travel a critically-damped spring already leaves
    // at ~1800px/s, so a 400px/s handoff moves the 5px crossing by less than
    // one frame while still being plainly ahead throughout.
    expect(at(thrown.samples, 0.1)).toBeLessThan(at(cold.samples, 0.1));
    expect(at(thrown.samples, 0.2)).toBeLessThan(at(cold.samples, 0.2));
  });

  test("launched away from the target, it travels outward first", () => {
    const { samples } = run({ damping: 1, response: 0.35 }, 100, 0, 600);
    expect(Math.max(...samples)).toBeGreaterThan(100);
  });
});

describe("integration", () => {
  test("is frame-rate independent — 60Hz and 120Hz agree", () => {
    const a = run({ damping: 1, response: 0.35 }, 100, 0, 0, 60);
    const b = run({ damping: 1, response: 0.35 }, 100, 0, 0, 120);
    // Analytic rather than stepped, so this is exact rather than merely
    // close: a dropped frame produces a longer step, never a wrong one.
    expect(at(a.samples, 0.2, 60)).toBeCloseTo(at(b.samples, 0.2, 120), 3);
  });

  test("re-targeting mid-flight keeps position and velocity", () => {
    now = 0;
    queue.length = 0;
    const samples: number[] = [];
    const spring = new Spring(100, {
      damping: 1,
      response: 0.35,
      onChange: (x) => samples.push(x),
    });
    spring.to(0);

    // Ten frames in, send it back where it came from.
    for (let i = 0; i < 10; i += 1) {
      now += 1000 / 60;
      for (const cb of queue.splice(0, queue.length)) cb(now);
    }
    const caught = spring.value;
    const carried = spring.velocity;
    expect(caught).toBeLessThan(100);
    expect(carried).toBeLessThan(0); // still travelling toward 0

    spring.to(100);
    // The reversal must bend, not restart: the very next frame still moves in
    // the old direction, because the carried velocity has not been zeroed.
    now += 1000 / 60;
    for (const cb of queue.splice(0, queue.length)) cb(now);
    expect(spring.value).toBeLessThan(caught);
  });
});
