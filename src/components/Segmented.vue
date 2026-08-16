<script setup lang="ts" generic="T extends string | number">
/**
 * Segmented control — two to four mutually exclusive options, all visible.
 *
 * The indicator is a real element that *slides* between segments, positioned
 * by two springs, rather than a background colour that hops from one item to
 * the next. That is the entire design of the control: the movement is what
 * says these are one control in different states. A background that jumps
 * reads as two separate things lighting up, and the member has to re-read the
 * row to work out what changed.
 *
 * Sliding also hints in the direction of travel — by the time the indicator is
 * halfway, its destination is already obvious, so the outcome is legible
 * before the animation finishes.
 */
import { nextTick, onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useSpring } from "../motion/useSpring";
import { haptics } from "../composables/haptics";

interface Segment {
  value: T;
  label: string;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    modelValue: T;
    segments: Segment[];
    /** Fill the available width instead of hugging the labels. */
    block?: boolean;
    /** Accessible name for the group. */
    label?: string;
  }>(),
  { block: false },
);

const emit = defineEmits<{ "update:modelValue": [T] }>();

const root = ref<HTMLElement | null>(null);
const items = ref<(HTMLElement | null)[]>([]);

// Independent springs per axis — a single spring on "the indicator" would have
// to interpolate position and width together, and they are not the same
// distance, so the box would visibly stretch on the way rather than glide.
const {
  value: indicatorX,
  to: moveIndicator,
  set: placeIndicator,
} = useSpring(0, { preset: "snappy" });
const {
  value: indicatorW,
  to: sizeIndicator,
  set: placeWidth,
} = useSpring(0, {
  preset: "snappy",
});

let measured = false;

function measure(animated: boolean) {
  const index = props.segments.findIndex((s) => s.value === props.modelValue);
  const el = items.value[index];
  const container = root.value;
  if (!el || !container) return;

  // On a narrow screen the control scrolls (see .segmented in components.css),
  // and the selected segment is the one thing that must never be the part
  // off-screen — otherwise the control shows a state it is not displaying.
  // Skipped on the initial measure: scrolling a control into view on page load
  // moves the page under somebody who has not touched anything yet.
  if (animated && measured && container.scrollWidth > container.clientWidth) {
    el.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  }

  // offsetLeft is relative to the offset parent, which is the container here
  // because .segmented is positioned. Reading the rects instead would fold in
  // the page's scroll position and drift on a horizontally scrolled layout.
  //
  // It stays correct once the control itself scrolls, too: the indicator is
  // absolutely positioned inside the scroll container, so it is part of the
  // scrolled content and travels with the segments rather than staying pinned
  // to the viewport edge.
  const x = el.offsetLeft;
  const w = el.offsetWidth;

  if (animated && measured) {
    moveIndicator(x);
    sizeIndicator(w);
  } else {
    // First paint must not animate: an indicator that slides in from x=0 on
    // page load animates a state nobody changed.
    placeIndicator(x);
    placeWidth(w);
    measured = true;
  }
}

function select(segment: Segment) {
  if (segment.disabled || segment.value === props.modelValue) return;
  haptics.selection();
  emit("update:modelValue", segment.value);
}

/** Left/Right move the selection, which is what a native radio group does. */
function onKeydown(event: KeyboardEvent) {
  const delta =
    event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
  if (!delta) return;
  event.preventDefault();
  const index = props.segments.findIndex((s) => s.value === props.modelValue);
  for (let step = 1; step <= props.segments.length; step += 1) {
    const next =
      props.segments[
        (index + delta * step + props.segments.length * step) %
          props.segments.length
      ];
    if (next && !next.disabled) {
      select(next);
      return;
    }
  }
}

watch(
  () => props.modelValue,
  () => measure(true),
);
watch(
  () => props.segments.length,
  () => nextTick(() => measure(false)),
);

let observer: ResizeObserver | undefined;

onMounted(() => {
  nextTick(() => measure(false));
  // The labels are text, so the control's geometry changes with the font size,
  // the locale and the container width. Re-measure rather than assume.
  if (typeof ResizeObserver !== "undefined" && root.value) {
    observer = new ResizeObserver(() => measure(false));
    observer.observe(root.value);
  }
});

onBeforeUnmount(() => observer?.disconnect());
</script>

<template>
  <div
    ref="root"
    class="segmented"
    :class="block ? 'flex w-full' : ''"
    role="tablist"
    :aria-label="label"
    @keydown="onKeydown"
  >
    <span
      class="segmented-indicator"
      aria-hidden="true"
      :style="{
        transform: `translateX(${indicatorX}px)`,
        width: `${indicatorW}px`,
      }"
    />
    <button
      v-for="(segment, index) in segments"
      :key="String(segment.value)"
      :ref="(el) => (items[index] = el as HTMLElement | null)"
      type="button"
      role="tab"
      class="segmented-item"
      :aria-selected="segment.value === modelValue"
      :data-selected="segment.value === modelValue ? 'true' : 'false'"
      :disabled="segment.disabled"
      :tabindex="segment.value === modelValue ? 0 : -1"
      @click="select(segment)"
    >
      {{ segment.label }}
    </button>
  </div>
</template>
