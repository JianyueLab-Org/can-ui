<script setup lang="ts">
/**
 * Accessible on/off switch, label included.
 *
 * The label lives here rather than at the call site so the `aria-labelledby`
 * wiring cannot be forgotten. That is not hypothetical: the six hand-rolled
 * copies this replaces each carried a bare `<label>` naming nothing, and each
 * hardcoded `bg-gray-200` for the off track — which on a dark card renders a
 * pale pill and reads as *on*.
 *
 * The knob is on a spring rather than a CSS transition. A switch is small
 * enough that the difference is subtle, but it is the same difference
 * everywhere else in this system: the knob can be re-targeted mid-travel, so
 * a member who flips the switch twice quickly sees it bend and come back
 * rather than finish, stop dead, and set off again.
 */
import { computed, useId, watch } from "vue";
import { useSpring } from "../motion/useSpring";
import { haptics } from "../composables/haptics";

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    label?: string;
    description?: string;
    disabled?: boolean;
  }>(),
  { disabled: false },
);

const emit = defineEmits<{ "update:modelValue": [boolean] }>();

// useId (Vue 3.5+) is stable across the SSR render and hydration; a random id
// would differ between the two and desync `aria-labelledby`.
const labelId = useId();

// Travel is 20px: a 44px track less 4px of inset and the 20px knob.
const KNOB_TRAVEL = 20;
// Destructured so `knobX` is a top-level ref and the template can read it as a
// plain number — a ref nested inside a returned object is not unwrapped.
const { value: knobX, to: moveKnob } = useSpring(
  props.modelValue ? KNOB_TRAVEL : 0,
  { preset: "snappy" },
);

watch(
  () => props.modelValue,
  (on) => moveKnob(on ? KNOB_TRAVEL : 0),
);

function toggle() {
  if (props.disabled) return;
  // Fired here, in the same handler that starts the spring, so the haptic and
  // the movement land together. From an onRest callback they would not.
  haptics.selection();
  emit("update:modelValue", !props.modelValue);
}

const trackClass = computed(() => [
  // tap-target, not a bigger track: 24px is the switch's design and the row
  // is laid out around it. The hit area grows; nothing moves.
  "tap-target relative inline-flex h-6 w-11 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-[var(--ease-out-quint)]",
  // --border-strong swaps with the theme, so "off" stays legibly off on both
  // a white card and a #151c25 one.
  props.modelValue ? "bg-airwaysn" : "bg-[var(--border-strong)]",
  props.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
]);
</script>

<template>
  <div class="flex items-start justify-between gap-4">
    <span v-if="label || description" class="min-w-0">
      <span :id="labelId" class="block text-sm font-medium text-ink">
        {{ label }}
      </span>
      <span v-if="description" class="mt-0.5 block text-sm text-muted">
        {{ description }}
      </span>
    </span>
    <button
      type="button"
      role="switch"
      :aria-checked="modelValue"
      :aria-labelledby="label ? labelId : undefined"
      :disabled="disabled"
      :class="trackClass"
      @click="toggle"
    >
      <span
        class="pointer-events-none inline-block size-5 rounded-full bg-white shadow ring-0"
        :style="{ transform: `translateX(${knobX}px)` }"
      />
    </button>
  </div>
</template>
