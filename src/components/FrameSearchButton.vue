<script setup lang="ts">
/** The visible ⌘K trigger. `bar` sits in a top bar, `rail` in the side rail. */
import Icon from "./Icon.vue";

withDefaults(
  defineProps<{
    label: string;
    placeholder: string;
    variant?: "bar" | "rail";
    collapsed?: boolean;
  }>(),
  { variant: "bar", collapsed: false },
);

const emit = defineEmits<{ open: [] }>();
</script>

<template>
  <button
    v-if="variant === 'rail'"
    type="button"
    class="focus-ring rail-item flex w-full items-center gap-2 rounded-control border border-subtle bg-surface px-2.5 py-2 text-sm text-faint transition-colors hover:border-strong hover:text-muted"
    :aria-label="label"
    :title="collapsed ? label : undefined"
    @click="emit('open')"
  >
    <Icon name="magnifyingGlass" class="size-4 shrink-0" />
    <span class="rail-label truncate">{{ placeholder }}</span>
    <kbd
      class="rail-label ml-auto shrink-0 rounded border border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[0.625rem]"
    >
      ⌘K
    </kbd>
  </button>
  <!-- Icon-only on a phone; a labelled pill from sm up. -->
  <button
    v-else
    type="button"
    class="focus-ring flex size-10 shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-sunken hover:text-ink sm:h-9 sm:w-52 sm:justify-start sm:gap-2 sm:border sm:border-subtle sm:bg-surface-sunken sm:px-3 sm:text-sm sm:text-faint sm:hover:border-strong sm:hover:text-muted"
    :aria-label="label"
    @click="emit('open')"
  >
    <Icon name="magnifyingGlass" class="size-5 shrink-0 sm:size-4" />
    <span class="hidden truncate sm:inline">{{ placeholder }}</span>
    <kbd
      class="ml-auto hidden shrink-0 rounded border border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[0.625rem] text-faint sm:block"
    >
      ⌘K
    </kbd>
  </button>
</template>
