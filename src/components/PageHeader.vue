<script setup lang="ts">
/**
 * One page header for every panel page.
 *
 * It exists to answer "where am I" in the same place on every screen. That
 * consistency is the feature — a heading that moves, changes size or changes
 * weight between pages costs the member a re-orientation on every navigation,
 * and they pay it without ever being able to name what is wrong.
 *
 * The type steps come from the scale in base.css, so the title's tracking and
 * leading change with its size rather than being one fixed pair applied at
 * every breakpoint.
 */
import Icon from "./Icon.vue";

withDefaults(
  defineProps<{
    title: string;
    description?: string;
    /** Small uppercase label above the title. */
    eyebrow?: string;
    /** ICON_PATHS key rendered in a brand tile beside the title. */
    icon?: string;
    /** Adds the bottom rule used on list/table pages. */
    divided?: boolean;
    /** Drops the bottom margin, for parents that space their own children. */
    flush?: boolean;
  }>(),
  { divided: false, flush: false },
);
</script>

<template>
  <div
    :class="[
      'flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between',
      flush ? '' : 'mb-8',
      divided ? 'border-b border-subtle pb-6' : '',
    ]"
  >
    <div class="flex min-w-0 items-start gap-4">
      <span
        v-if="icon"
        class="hidden size-11 shrink-0 items-center justify-center rounded-card bg-info-bg text-info-fg sm:flex"
      >
        <Icon :name="icon" class="size-6" />
      </span>
      <div class="min-w-0">
        <p v-if="eyebrow" class="text-eyebrow mb-1.5 text-airwaysn">
          {{ eyebrow }}
        </p>
        <h1 class="text-title-1 text-ink">
          <slot name="title">{{ title }}</slot>
        </h1>
        <p v-if="description || $slots.description" class="mt-2 text-muted">
          <slot name="description">{{ description }}</slot>
        </p>
      </div>
    </div>

    <div
      v-if="$slots.actions"
      class="flex shrink-0 flex-wrap items-center gap-3"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
