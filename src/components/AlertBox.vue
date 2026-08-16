<script setup lang="ts">
/**
 * Inline feedback banner — a form error, an action confirmation, a load
 * failure.
 *
 * Feedback comes in four kinds and this component covers all four, which is
 * why the variant is not cosmetic: `danger` renders `role="alert"` so a
 * screen reader interrupts with it, and everything else renders
 * `role="status"` so it is announced without cutting the member off
 * mid-sentence. Getting that backwards means either a failure nobody hears or
 * a success that talks over them.
 *
 * **A failure raised while a dialog is open must render inside the dialog.**
 * A page-level banner sits behind the backdrop, so an error announced there
 * reads to the member as nothing having happened at all.
 */
import { computed } from "vue";
import Icon from "./Icon.vue";

const props = withDefaults(
  defineProps<{
    variant?: "success" | "danger" | "warning" | "info";
    title?: string;
    dismissible?: boolean;
  }>(),
  { variant: "info", dismissible: false },
);

defineEmits<{ (e: "dismiss"): void }>();

const tone = computed(
  () =>
    ({
      success: { wrap: "bg-success-bg text-success-fg", icon: "checkCircle" },
      danger: { wrap: "bg-danger-bg text-danger-fg", icon: "xCircle" },
      warning: {
        wrap: "bg-warning-bg text-warning-fg",
        icon: "exclamationTriangle",
      },
      info: { wrap: "bg-info-bg text-info-fg", icon: "informationCircle" },
    })[props.variant],
);
</script>

<template>
  <div
    :class="['flex gap-3 rounded-card px-4 py-3', tone.wrap]"
    :role="variant === 'danger' ? 'alert' : 'status'"
  >
    <Icon :name="tone.icon" class="mt-0.5 size-5 shrink-0" />
    <div class="min-w-0 flex-1 text-sm">
      <p v-if="title" class="font-semibold">{{ title }}</p>
      <div :class="title ? 'mt-0.5 opacity-90' : ''">
        <slot />
      </div>
    </div>
    <button
      v-if="dismissible"
      type="button"
      class="tap-target -m-1 shrink-0 self-start rounded-control p-1 opacity-70 transition hover:opacity-100"
      aria-label="Dismiss"
      @click="$emit('dismiss')"
    >
      <Icon name="xMark" class="size-4" />
    </button>
  </div>
</template>
