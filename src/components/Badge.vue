<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    variant?: "success" | "danger" | "warning" | "info" | "neutral";
    size?: "sm" | "md";
    /** Leading status dot — for live/online style indicators. */
    dot?: boolean;
    /** Animate the dot. Only meaningful with `dot`. */
    pulse?: boolean;
  }>(),
  { variant: "neutral", size: "md", dot: false, pulse: false },
);

const classes = computed(() => [
  "badge",
  `badge-${props.variant}`,
  props.size === "sm" ? "px-2 py-0.5 text-[0.6875rem]" : "",
]);

const dotClass = computed(() => [
  "size-1.5 shrink-0 rounded-full bg-current",
  // A slow full-viewport oscillation is one of the things reduced motion asks
  // us to stop; a 6px dot is neither large nor moving, so it stays. It is also
  // the only signal that a value is live rather than stale.
  props.pulse ? "animate-pulse" : "",
]);
</script>

<template>
  <span :class="classes">
    <span v-if="dot" :class="dotClass" aria-hidden="true"></span>
    <slot />
  </span>
</template>
