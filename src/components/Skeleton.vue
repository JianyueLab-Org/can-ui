<script setup lang="ts">
/**
 * The default loading state for anything that occupies a region.
 *
 * Pick the `variant` that matches what will replace it. This is not a
 * cosmetic choice: a `cards` placeholder followed by a table is *worse* than
 * no placeholder at all, because it promises one layout and delivers another,
 * and the correction reads as the page breaking rather than loading. Compose
 * two for a stats-then-table page.
 */
withDefaults(
  defineProps<{
    variant?: "text" | "cards" | "stats" | "table";
    /** Lines, cards, tiles or rows, depending on the variant. */
    count?: number;
    /** Draw a page-header placeholder above the block. */
    header?: boolean;
  }>(),
  { variant: "text", count: 3, header: false },
);
</script>

<template>
  <div role="status" aria-busy="true" aria-live="polite">
    <span class="sr-only">Loading</span>

    <div v-if="header" class="mb-8">
      <div class="skeleton h-8 w-56"></div>
      <div class="skeleton mt-3 h-4 w-80 max-w-full"></div>
    </div>

    <div v-if="variant === 'text'" class="space-y-2.5">
      <div
        v-for="n in count"
        :key="n"
        class="skeleton h-4"
        :style="{ width: n === count ? '60%' : '100%' }"
      ></div>
    </div>

    <div
      v-else-if="variant === 'stats'"
      class="grid grid-cols-2 gap-4 lg:grid-cols-4"
    >
      <div v-for="n in count" :key="n" class="card p-4 sm:p-5">
        <div class="skeleton h-3.5 w-20"></div>
        <div class="skeleton mt-3 h-7 w-16"></div>
      </div>
    </div>

    <div
      v-else-if="variant === 'cards'"
      class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
    >
      <div v-for="n in count" :key="n" class="card p-6">
        <div class="skeleton h-5 w-2/3"></div>
        <div class="skeleton mt-3 h-4 w-full"></div>
        <div class="skeleton mt-2 h-4 w-4/5"></div>
      </div>
    </div>

    <div v-else class="card overflow-hidden">
      <div class="border-b border-subtle px-4 py-3">
        <div class="skeleton h-4 w-32"></div>
      </div>
      <div class="divide-y divide-subtle">
        <div
          v-for="n in count"
          :key="n"
          class="flex items-center gap-4 px-4 py-3.5"
        >
          <div class="skeleton h-4 flex-1"></div>
          <div class="skeleton h-4 w-24"></div>
          <div class="skeleton h-4 w-16"></div>
        </div>
      </div>
    </div>
  </div>
</template>
