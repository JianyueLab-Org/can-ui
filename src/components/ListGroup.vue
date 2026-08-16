<script setup lang="ts">
/**
 * An inset grouped list — the shape a settings screen wants, and the shape
 * about half of our "table" pages actually want.
 *
 * A table is the right tool for a *grid of data*: many rows, comparable
 * columns, values you scan down. It is the wrong tool for a list of settings
 * or a handful of records with different-shaped contents, where every row is
 * read across rather than down and half the columns are empty for half the
 * rows. Grouping instead puts each control next to the thing it controls,
 * which is what makes a row readable without a column header explaining it.
 *
 * The optional `title` sits *outside* the group, in the margin — it labels the
 * group without becoming a row of it, so the first real row keeps the rounded
 * corner and the group reads as one object.
 */
withDefaults(
  defineProps<{
    /** Section label above the group. */
    title?: string;
    /** Explanatory copy below the group, in the margin. */
    footnote?: string;
  }>(),
  {},
);
</script>

<template>
  <section>
    <h3 v-if="title" class="list-group-title">{{ title }}</h3>
    <div class="list-group">
      <slot />
    </div>
    <p v-if="footnote || $slots.footnote" class="mt-2 px-3 text-xs text-muted">
      <slot name="footnote">{{ footnote }}</slot>
    </p>
  </section>
</template>
