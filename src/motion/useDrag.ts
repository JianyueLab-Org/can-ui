import { onScopeDispose, watch, type Ref } from "vue";
import { VelocityTracker } from "./tracker";

export interface DragState {
  /** Pointer position, in client coordinates. */
  x: number;
  y: number;
  /** Total movement since the gesture started, in px. */
  dx: number;
  dy: number;
  /** Movement since the previous event, in px. */
  stepX: number;
  stepY: number;
  /** Velocity in px/s, averaged over a short window. Meaningful at end. */
  vx: number;
  vy: number;
  /** Where inside the element the pointer grabbed it, in px from top-left. */
  grabX: number;
  grabY: number;
  /** Which way the gesture committed once it passed the threshold. */
  axis: "x" | "y" | null;
  event: PointerEvent;
}

export interface UseDragOptions {
  /** Restrict to one axis; `null` lets the gesture pick, `false` allows both. */
  axis?: "x" | "y" | null | false;
  /** px of movement before the gesture is considered to have started. */
  threshold?: number;
  /** Ignore pointerdown that lands inside a match for this selector. */
  ignore?: string;
  enabled?: () => boolean;
  onStart?: (state: DragState) => void;
  onMove?: (state: DragState) => void;
  onEnd?: (state: DragState) => void;
  /** The pointer left without a clean release (cancelled, another gesture won). */
  onCancel?: (state: DragState) => void;
}

/**
 * Direct manipulation: the content stays under the finger.
 *
 * The details here are the ones that separate a drag that feels like touching
 * something from one that feels like operating a control:
 *
 * **Grab offset.** The element must move by how far the pointer moved, not to
 * where the pointer is. Snapping the element's centre to the finger on grab is
 * the single most common way to break the illusion — you grabbed the corner of
 * a card and it jumped.
 *
 * **Pointer capture.** Tracking has to continue when the pointer leaves the
 * element's bounds, which during any fast drag it immediately does. Without
 * capture the gesture dies the moment the finger outruns the element.
 *
 * **A movement threshold before committing to an axis.** Fingers are not
 * precise; the first 10px of a vertical swipe contain plenty of horizontal
 * noise. Deciding direction on the first `pointermove` picks wrong regularly.
 *
 * **`touch-action`.** Set it on the draggable element (`touch-action: none`
 * for a free drag, `pan-x`/`pan-y` to keep one axis of native scrolling). This
 * composable deliberately does not set it: it is a layout decision that has to
 * survive server rendering, and a surface that is draggable *and* scrollable
 * needs the browser to arbitrate rather than us.
 */
export function useDrag(
  target: Ref<HTMLElement | null | undefined>,
  options: UseDragOptions = {},
) {
  const { axis = false, threshold = 10, ignore, enabled } = options;

  const tracker = new VelocityTracker();
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  let lastX = 0;
  let lastY = 0;
  let grabX = 0;
  let grabY = 0;
  let started = false;
  let lockedAxis: "x" | "y" | null = null;

  function state(event: PointerEvent): DragState {
    const velocity = tracker.velocity();
    return {
      x: event.clientX,
      y: event.clientY,
      dx: event.clientX - startX,
      dy: event.clientY - startY,
      stepX: event.clientX - lastX,
      stepY: event.clientY - lastY,
      vx: velocity.x,
      vy: velocity.y,
      grabX,
      grabY,
      axis: lockedAxis,
      event,
    };
  }

  function onPointerDown(event: PointerEvent) {
    if (pointerId !== null) return;
    if (enabled && !enabled()) return;
    // Secondary buttons are a context menu, not a drag.
    if (event.button !== 0 && event.pointerType === "mouse") return;
    if (ignore && (event.target as Element | null)?.closest(ignore)) return;

    const el = target.value;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    grabX = event.clientX - rect.left;
    grabY = event.clientY - rect.top;

    pointerId = event.pointerId;
    startX = lastX = event.clientX;
    startY = lastY = event.clientY;
    started = false;
    lockedAxis = axis === "x" || axis === "y" ? axis : null;

    tracker.reset();
    tracker.add(event.clientX, event.clientY, event.timeStamp);

    // Capture on down, so the rest of the gesture is ours even once the
    // pointer has left the element — which on any quick drag is immediately.
    el.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;

    tracker.add(event.clientX, event.clientY, event.timeStamp);

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!started) {
      if (Math.hypot(dx, dy) < threshold) return;
      // Direction is decided once, at the moment intent becomes clear, and
      // then held for the rest of the gesture. Re-deciding per frame makes a
      // near-diagonal drag flip axis repeatedly and judder.
      if (axis === null) lockedAxis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      started = true;
      options.onStart?.(state(event));
    }

    options.onMove?.(state(event));
    lastX = event.clientX;
    lastY = event.clientY;
  }

  function finish(event: PointerEvent, cancelled: boolean) {
    if (event.pointerId !== pointerId) return;
    const el = target.value;
    if (el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    const final = state(event);
    pointerId = null;
    if (started) {
      started = false;
      if (cancelled) options.onCancel?.(final);
      else options.onEnd?.(final);
    }
    tracker.reset();
  }

  function onPointerUp(event: PointerEvent) {
    finish(event, false);
  }
  function onPointerCancel(event: PointerEvent) {
    finish(event, true);
  }

  function attach(el: HTMLElement) {
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerCancel);
  }

  function detach(el: HTMLElement) {
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerCancel);
  }

  // Bound by watcher rather than onMounted: the element behind a `v-if` does
  // not exist yet at mount, and a sheet is exactly that.
  const stop = watch(
    target,
    (el, previous) => {
      if (previous) detach(previous);
      if (el) attach(el);
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    stop();
    if (target.value) detach(target.value);
  });

  return { isDragging: () => pointerId !== null && started };
}
