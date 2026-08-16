<script setup lang="ts">
import { computed, useSlots } from "vue";

const props = withDefaults(
  defineProps<{
    padding?: "none" | "sm" | "md" | "lg";
    /** Lift on hover. Only for a card that is itself a link or a button. */
    hover?: boolean;
    as?: string;
    /** Convenience header — equivalent to filling the `header` slot. */
    title?: string;
    subtitle?: string;
  }>(),
  { padding: "md", hover: false, as: "div" },
);

const slots = useSlots();

const padClass = computed(() => {
  switch (props.padding) {
    case "none":
      return "";
    case "sm":
      return "p-4";
    case "lg":
      return "p-8";
    default:
      return "p-6";
  }
});

const hasHeader = computed(() => !!slots.header || !!props.title);

const rootClass = computed(() => [
  "card overflow-hidden",
  // The lift is a hint in the direction of the interaction: the card rises
  // *toward* the pointer, which telegraphs "this is the thing you are about
  // to open". A card that only changes colour says it is hoverable but not
  // what hovering leads to.
  props.hover
    ? "transition duration-200 ease-[var(--ease-out-quint)] hover:-translate-y-0.5 hover:shadow-card-hover"
    : "",
]);
</script>

<template>
  <component :is="as" :class="rootClass">
    <div
      v-if="hasHeader"
      class="flex flex-wrap items-center justify-between gap-3 border-b border-subtle px-6 py-4"
    >
      <slot name="header">
        <div class="min-w-0">
          <h2 class="text-title-3 text-ink">{{ title }}</h2>
          <p v-if="subtitle" class="mt-0.5 text-sm text-muted">
            {{ subtitle }}
          </p>
        </div>
      </slot>
      <div v-if="slots.headerActions" class="flex items-center gap-2">
        <slot name="headerActions" />
      </div>
    </div>
    <div :class="padClass">
      <slot />
    </div>
    <div
      v-if="slots.footer"
      class="border-t border-subtle bg-surface-sunken px-6 py-4"
    >
      <slot name="footer" />
    </div>
  </component>
</template>
