<script lang="ts">
export type { PopoverPlacement } from "../popoverPosition";
</script>

<script setup lang="ts">
/**
 * A panel anchored to the control that opened it — a menu, a filter, a detail
 * card.
 *
 * **It scales from its trigger, not from its own centre.** `transform-origin`
 * is set to the corner nearest the button, so the panel visibly grows *out of*
 * the thing that was pressed. That one property is most of what makes a
 * popover feel connected to its control rather than dropped on top of the
 * page, and it is the difference between "this belongs to that button" and
 * "something appeared".
 *
 * **It materialises rather than fading.** The blur radius and the scale animate
 * together, so the glass reads as arriving rather than as a picture of glass
 * becoming visible.
 *
 * **It does not dim the page.** A popover is a *parallel* surface: the member
 * is still in the flow they were in, and dimming everything else would claim
 * otherwise. Translucency and offset carry the hierarchy instead. If the task
 * genuinely blocks — it must be answered before anything else — that is a
 * Dialog, not this.
 *
 * Positioned `fixed` and teleported to the body, so it is not clipped by a
 * card's `overflow: hidden` or shifted by a transformed ancestor.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useOverlay } from "../composables/useOverlay";
import {
  placePopover,
  popoverOrigin,
  type PopoverPlacement,
  type ResolvedPlacement,
} from "../popoverPosition";

type Placement = PopoverPlacement;

const props = withDefaults(
  defineProps<{
    placement?: Placement;
    /** Gap between the trigger and the panel, in px. */
    offset?: number;
    /** Panel width. Anything CSS accepts. */
    width?: string;
    label?: string;
  }>(),
  { placement: "bottom-start", offset: 8, width: "16rem" },
);

/**
 * Uncontrolled by default, controlled when a parent binds `v-model:open`.
 *
 * Unlike a Dialog — which is opened from somewhere else entirely and therefore
 * has to be told — a Popover owns the button that opens it. Forcing every call
 * site to declare a ref for state that never leaves this component would be
 * boilerplate at each of them, and the one thing worse than a menu with no
 * state is thirty menus each keeping their own copy of it by hand.
 */
const isOpen = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{ close: [] }>();

watch(isOpen, (open) => {
  if (!open) emit("close");
});

// No scroll lock: the page behind a popover is still live, and locking it says
// otherwise. The focus trap stays — once focus is inside the panel, Tab should
// cycle it rather than walk off into a page the member cannot see moving.
const panel = useOverlay(isOpen, { lockScroll: false });
const trigger = ref<HTMLElement | null>(null);
const mounted = ref(false);

// Only the *position* is computed. The panel's size is bound separately, in
// `sizing` below, because `place()` has to measure a panel that is already the
// width it will end up being — see the note there.
const style = ref<Record<string, string>>({});

/**
 * The panel's own size, applied on the very first render.
 *
 * This is deliberately not written by `place()`. When the width arrived with
 * the position, the first open rendered the panel shrink-to-fit — no class
 * here carries a width — and `place()` then measured *that* unconstrained box.
 * Every decision it makes reads the measurement: the flip, the alignment,
 * `left = rect.right - panelRect.width`, and the viewport clamp. A wide
 * shrink-to-fit panel (NetworkMenu is `bottom-end`, `19rem`, nine rows of
 * untruncated CJK) therefore landed mis-aligned, and once the measured width
 * exceeded `vw - 16` the clamp's upper bound fell below its lower bound and
 * produced a negative `left` — the panel hung off the left edge.
 *
 * It looked flaky rather than broken because the *second* open was correct:
 * `style.value` still held the previous run's width, so by then there was one.
 */
const sizing = computed(() => ({
  width: props.width,
  // The panel must never be wider than the screen it is anchored on. Without
  // this a 20rem popover on a 320px phone runs off the right edge, and the
  // clamp in `place()` can only push it left — it cannot make it fit.
  maxWidth: "calc(100vw - 1rem)",
}));

/** Which corner of the panel sits against the trigger. */
const resolved = ref<ResolvedPlacement>(props.placement);

const origin = computed(() => {
  const { x, y } = popoverOrigin(resolved.value);
  return { "--origin-x": x, "--origin-y": y };
});

// Flip rather than clip, and keep inside the viewport: `popoverPosition.ts`.
function place() {
  const anchor = trigger.value;
  const el = panel.value;
  if (!anchor || !el) return;

  const result = placePopover(
    props.placement,
    anchor.getBoundingClientRect(),
    el.getBoundingClientRect(),
    { width: window.innerWidth, height: window.innerHeight },
    props.offset,
  );
  resolved.value = result.resolved;
  style.value = { top: `${result.top}px`, left: `${result.left}px` };
}

function toggle() {
  isOpen.value = !isOpen.value;
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!isOpen.value) return;
  const target = event.target as Node;
  if (panel.value?.contains(target) || trigger.value?.contains(target)) return;
  isOpen.value = false;
}

// Re-placed rather than closed on scroll: closing a menu because the page moved
// under it loses whatever the member was in the middle of choosing.
let frame = 0;
function onViewportChange() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    place();
  });
}

watch(isOpen, async (open) => {
  if (open) {
    await nextTick();
    place();
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);
  } else {
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
    window.removeEventListener("scroll", onViewportChange, true);
    window.removeEventListener("resize", onViewportChange);
  }
});

onMounted(() => (mounted.value = true));

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  if (typeof document === "undefined") return;
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  window.removeEventListener("scroll", onViewportChange, true);
  window.removeEventListener("resize", onViewportChange);
});
</script>

<template>
  <span ref="trigger" class="inline-flex">
    <slot name="trigger" :toggle="toggle" :open="isOpen" />
  </span>

  <Teleport to="body" :disabled="!mounted">
    <div
      v-if="isOpen"
      ref="panel"
      role="dialog"
      :aria-label="label"
      tabindex="-1"
      class="animate-materialize material-regular fixed z-50 overflow-hidden rounded-[var(--radius-sheet)] shadow-popover"
      :style="{ ...sizing, ...style, ...origin }"
    >
      <!-- Solid content on the material, never another material. -->
      <div
        class="vibrant max-h-[70dvh] overflow-y-auto overscroll-contain p-1.5"
      >
        <slot :close="() => (isOpen = false)" />
      </div>
    </div>
  </Teleport>
</template>
