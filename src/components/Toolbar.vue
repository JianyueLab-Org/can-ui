<script setup lang="ts">
/**
 * Floating chrome — a page header, a filter bar, an action row that stays put
 * while content scrolls underneath.
 *
 * It is a *material*, not an opaque strip. The difference is what happens to
 * the space it occupies: an opaque bar takes 56px off the top of the viewport
 * permanently, and on a phone in landscape that is a large fraction of what
 * the member has. A translucent bar gives that space back — content passes
 * beneath it, stays partly legible, and the page reads as taller than it is.
 *
 * **The edge is a fade, not a rule.** A 1px divider under a sticky header
 * draws a line across the page whether or not anything is beneath it — at the
 * top of a short page it is a line to nowhere. `blurred` fades the content
 * into the bar instead, which appears only where the two actually overlap.
 *
 * Never nest one of these inside another material.
 */
withDefaults(
  defineProps<{
    /** Which edge it sticks to. Also decides where the bright hairline goes. */
    edge?: "top" | "bottom" | "none";
    /** Material weight. Heavier separates structure; lighter floats over it. */
    weight?: "thin" | "regular" | "thick";
    /** Draw the soft scroll edge where content passes under the bar. */
    blurred?: boolean;
    as?: string;
  }>(),
  { edge: "top", weight: "thin", blurred: true, as: "div" },
);
</script>

<template>
  <component
    :is="as"
    :class="[
      'z-30 flex items-center gap-3 px-4 sm:px-6',
      `material-${weight}`,
      edge === 'top' ? 'sticky top-0 pt-safe' : '',
      edge === 'bottom' ? 'sticky bottom-0 pb-safe' : '',
      // The hairline goes on the edge facing away from the content, so it
      // reads as the material's own thickness catching the light rather than
      // as a border between two blocks.
      blurred && edge === 'top' ? 'material-edge-bottom' : '',
      blurred && edge === 'bottom' ? 'material-edge-top' : '',
    ]"
  >
    <div v-if="$slots.leading" class="flex shrink-0 items-center gap-2">
      <slot name="leading" />
    </div>

    <div class="vibrant min-w-0 flex-1 py-3">
      <slot />
    </div>

    <div v-if="$slots.trailing" class="flex shrink-0 items-center gap-2">
      <slot name="trailing" />
    </div>
  </component>
</template>
