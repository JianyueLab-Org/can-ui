<script setup lang="ts">
/**
 * The button.
 *
 * Props are deliberately identical to can-web's `BaseButton`, so migrating a
 * site is a change of import path and nothing else.
 *
 * What is new is the press. `.btn:active` already scales the control on
 * pointer-down — feedback on *down*, never on release, because the moment a
 * control waits for touch-up to acknowledge a press the interface stops
 * feeling direct. `usePress` adds the half `:active` cannot do: the press
 * releases when the finger slides off the control and comes back if it slides
 * back on. That is the standard way out of a press somebody regrets, and
 * without the highlight tracking it there is no way to tell whether letting go
 * will still fire.
 */
import { computed, ref } from "vue";
import Spinner from "./Spinner.vue";
import { usePress } from "../composables/usePress";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "soft" | "danger" | "ghost" | "glass";
    size?: "sm" | "md" | "lg";
    type?: "button" | "submit" | "reset";
    disabled?: boolean;
    loading?: boolean;
    block?: boolean;
    as?: "button" | "a";
    href?: string;
    /** Square button with no label — pass the glyph in the `icon` slot. */
    iconOnly?: boolean;
    /** Accessible name. Required when `iconOnly`, since there is no text. */
    label?: string;
  }>(),
  {
    variant: "primary",
    size: "md",
    type: "button",
    disabled: false,
    loading: false,
    block: false,
    as: "button",
    iconOnly: false,
  },
);

const el = ref<HTMLElement | null>(null);
const isDisabled = computed(() => props.disabled || props.loading);
const { pressed } = usePress(el, { disabled: () => isDisabled.value });

const sizeClass = computed(() => {
  if (props.iconOnly) {
    return { sm: "size-8 p-0", md: "size-9 p-0", lg: "size-11 p-0" }[
      props.size
    ];
  }
  switch (props.size) {
    case "sm":
      return "px-3 py-1.5 text-xs gap-1.5";
    case "lg":
      return "px-6 py-3 text-base gap-2";
    default:
      return "px-4 py-2 text-sm gap-2";
  }
});

const classes = computed(() => [
  "btn",
  `btn-${props.variant}`,
  sizeClass.value,
  props.block ? "w-full" : "",
]);

const spinnerSize = computed(() => (props.size === "lg" ? "md" : "sm"));
</script>

<template>
  <a
    v-if="as === 'a'"
    ref="el"
    :href="isDisabled ? undefined : href"
    :class="[classes, isDisabled ? 'pointer-events-none' : '']"
    :aria-disabled="isDisabled || undefined"
    :aria-label="label"
    :data-pressed="pressed ? 'true' : undefined"
  >
    <Spinner v-if="loading" :size="spinnerSize" />
    <slot v-else name="icon" />
    <slot />
    <slot name="trailing" />
  </a>
  <button
    v-else
    ref="el"
    :type="type"
    :disabled="isDisabled"
    :class="classes"
    :aria-label="label"
    :aria-busy="loading || undefined"
    :data-pressed="pressed ? 'true' : undefined"
  >
    <Spinner v-if="loading" :size="spinnerSize" />
    <slot v-else name="icon" />
    <slot />
    <slot name="trailing" />
  </button>
</template>
