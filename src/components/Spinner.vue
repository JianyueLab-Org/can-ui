<script setup lang="ts">
/**
 * The one spinner for the whole network.
 *
 * **Reach for Skeleton first.** A spinner is correct only where there is no
 * shape to hold: inside a Button, which keeps its own size, and inline in a
 * one-line status ("正在验证…"). For a region — a table, a card grid, a panel —
 * a placeholder in the shape of the content beats a dot, because it holds the
 * layout instead of collapsing it and then snapping back when the data lands.
 * That snap is the thing members read as the page being broken.
 *
 * `centered` survives for a block genuinely too small or too irregular to
 * sketch.
 */
import { computed } from "vue";
import { createTranslator, loadingChrome } from "../i18n";

const props = withDefaults(
  defineProps<{
    size?: "sm" | "md" | "lg";
    /** Visible text beside the spinner; also its accessible name. */
    label?: string;
    /** Render as a centred block with generous padding. */
    centered?: boolean;
    /**
     * Locale of the accessible name when neither `label` nor
     * `messages.loading` is set. Unset, zh-cn. See `src/i18n.ts`.
     */
    locale?: string;
    /** Dictionary for the accessible name; reads `loading`. */
    messages?: Record<string, unknown>;
  }>(),
  {
    size: "md",
    label: undefined,
    centered: false,
    locale: undefined,
    messages: () => ({}),
  },
);

const accessibleName = computed(
  () =>
    props.label ||
    createTranslator(props.messages, loadingChrome(props.locale))("loading"),
);

const sizeClass = computed(
  () => ({ sm: "size-4", md: "size-6", lg: "size-10" })[props.size],
);
</script>

<template>
  <div
    :class="
      centered
        ? 'flex min-h-64 w-full flex-col items-center justify-center gap-3 py-12'
        : 'inline-flex items-center gap-2'
    "
    role="status"
    :aria-label="accessibleName"
  >
    <svg
      :class="[sizeClass, 'animate-spin text-can']"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        class="opacity-20"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="3"
      />
      <path
        class="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V1C5.9 1 1 5.9 1 12h3z"
      />
    </svg>
    <span v-if="label" class="text-sm text-muted">{{ label }}</span>
  </div>
</template>
