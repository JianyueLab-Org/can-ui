import { onScopeDispose, ref, watch, type Ref } from "vue";

export interface UsePressOptions {
  /** px the pointer may stray outside the target before the press is cancelled. */
  slop?: number;
  disabled?: () => boolean;
}

/**
 * Press feedback that arrives on pointer-*down* and can be taken back.
 *
 * `:active` gets the first half of this for free, and for most buttons that is
 * enough — which is why `.btn` carries the `:active` rule and most call sites
 * need nothing else. What `:active` does not give you is the second half:
 *
 * **Cancel by dragging away.** A member who presses a destructive button and
 * then thinks better of it expects to be able to slide off it and release
 * safely — that is the standard escape hatch on every touch platform, and it
 * is the only one available once the finger is already down. The highlight has
 * to come back off as they leave and back on if they return, or they have no
 * way to tell whether the press is still armed.
 *
 * **Slop.** The boundary is the element plus a margin, because a finger resting
 * on a target drifts by a few pixels without anybody intending to move it.
 * Cancelling exactly at the edge means a press that never moved on purpose
 * fails at random.
 */
export function usePress(
  target: Ref<HTMLElement | null | undefined>,
  options: UsePressOptions = {},
) {
  const { slop = 10, disabled } = options;
  const pressed = ref(false);
  let pointerId: number | null = null;

  function within(event: PointerEvent): boolean {
    const el = target.value;
    if (!el) return false;
    const r = el.getBoundingClientRect();
    return (
      event.clientX >= r.left - slop &&
      event.clientX <= r.right + slop &&
      event.clientY >= r.top - slop &&
      event.clientY <= r.bottom + slop
    );
  }

  function onPointerDown(event: PointerEvent) {
    if (disabled?.()) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;
    pointerId = event.pointerId;
    pressed.value = true;
    // Capture so the release is still ours after the finger has slid off —
    // without it the element never learns the press ended and stays lit.
    target.value?.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    pressed.value = within(event);
  }

  function release(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    const el = target.value;
    if (el?.hasPointerCapture(event.pointerId)) {
      el.releasePointerCapture(event.pointerId);
    }
    pointerId = null;
    pressed.value = false;
  }

  function attach(el: HTMLElement) {
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
  }

  function detach(el: HTMLElement) {
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", release);
    el.removeEventListener("pointercancel", release);
  }

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

  return { pressed };
}
