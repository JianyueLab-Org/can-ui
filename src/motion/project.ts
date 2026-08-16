/**
 * Momentum: where a gesture is *going*, and what a boundary feels like.
 */

/**
 * Project where a flick would come to rest.
 *
 * The mistake this replaces is snapping to whichever detent is nearest the
 * *release point*. That throws away the entire gesture: a slow drag and a hard
 * flick that happen to end at the same pixel produce the same result, so the
 * flick does nothing. Projecting first is what turns a small input into a big
 * output — a short, fast swipe can carry a sheet all the way closed, because
 * the target is chosen from where the momentum was headed.
 *
 * This is the exponential-decay form Apple ships in the *Designing Fluid
 * Interfaces* sample code, not the textbook v²/(2a). The distinction matters:
 * the textbook form is the answer for constant deceleration, and scroll
 * deceleration is not constant. Using it makes fast flicks travel much too
 * far and slow ones not far enough, which reads as an interface with an
 * inconsistent sense of weight.
 *
 * @param velocity px per second at release
 * @param decelerationRate 0.998 matches normal scroll feel; 0.99 is snappier
 * @returns the distance still to travel, in px, signed
 */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * Resistance past a boundary, rather than a hard stop.
 *
 * A drag that simply refuses to move past its bound reads as *frozen* — the
 * member's first thought is that the gesture was dropped or the page hung.
 * Continuous resistance says the same thing ("there is nothing more here")
 * while staying obviously alive and still tracking the finger. The further
 * past the edge, the less it follows, which is what every physical thing on a
 * tether does.
 *
 * @param overshoot how far past the bound the pointer has travelled, in px
 * @param dimension the size of the dragged surface along that axis, in px
 * @param constant lower = stiffer. 0.55 is the iOS feel.
 */
export function rubberband(
  overshoot: number,
  dimension: number,
  constant = 0.55,
): number {
  if (dimension <= 0) return 0;
  return (
    (overshoot * dimension * constant) /
    (dimension + constant * Math.abs(overshoot))
  );
}

/**
 * Clamp with rubber-band resistance outside the range instead of a hard edge.
 */
export function rubberbandClamp(
  value: number,
  min: number,
  max: number,
  dimension: number,
  constant = 0.55,
): number {
  if (value < min) return min + rubberband(value - min, dimension, constant);
  if (value > max) return max + rubberband(value - max, dimension, constant);
  return value;
}

/** Nearest entry in `points` to `value`. */
export function nearest(value: number, points: readonly number[]): number {
  let best = points[0] ?? value;
  let bestDistance = Math.abs(value - best);
  for (const point of points) {
    const distance = Math.abs(value - point);
    if (distance < bestDistance) {
      best = point;
      bestDistance = distance;
    }
  }
  return best;
}

/**
 * The whole release decision in one call: project the momentum forward, then
 * pick the detent nearest where it was heading.
 *
 * Hand the result to `Spring.to(target, { velocity })` with the same release
 * velocity and there is no seam — the finger lets go and the surface keeps
 * going at exactly the speed it was already moving.
 */
export function projectToDetent(
  position: number,
  velocity: number,
  detents: readonly number[],
  decelerationRate = 0.998,
): number {
  return nearest(position + project(velocity, decelerationRate), detents);
}

/**
 * Should a partly-completed gesture commit or snap back?
 *
 * Decided on the *sign of the velocity*, not on how far the drag got. A member
 * who flicks a sheet decisively downward has said "close" even if the sheet
 * has barely moved, and a slow drag past the halfway point that reverses at
 * the last moment has said "no". Position is only the tiebreak, for a release
 * with no meaningful velocity at all.
 *
 * @param progress 0..1 through the gesture
 * @param velocity px/s along the gesture axis, positive = toward commit
 * @param threshold position fallback when velocity is inconclusive
 */
export function shouldCommit(
  progress: number,
  velocity: number,
  { threshold = 0.5, minVelocity = 200 } = {},
): boolean {
  if (Math.abs(velocity) >= minVelocity) return velocity > 0;
  return progress >= threshold;
}
