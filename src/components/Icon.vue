<script setup lang="ts">
/**
 * Thin wrapper over ICON_PATHS, so call sites stop repeating eight lines of
 * <svg> boilerplate — and, more importantly, so they stop each deciding
 * whether the glyph is decorative.
 *
 * The default is `aria-hidden`, which is right for the overwhelming majority:
 * an icon next to a text label is decoration, and announcing it makes a screen
 * reader read the same thing twice. Pass `label` for the minority where the
 * glyph *is* the content — an icon-only button, a status dot with no text —
 * and it becomes an `img` with an accessible name instead.
 *
 * Size comes from the caller with a `size-*` utility; attrs fall through.
 */
import { computed } from "vue";
import { ICON_PATHS } from "../icons";

const props = defineProps<{
  name: string;
  /** Makes the glyph meaningful rather than decorative. */
  label?: string;
}>();

const path = computed(() => ICON_PATHS[props.name]);
</script>

<template>
  <svg
    v-if="path"
    class="size-5"
    fill="none"
    viewBox="0 0 24 24"
    stroke-width="1.5"
    stroke="currentColor"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : true"
  >
    <path stroke-linecap="round" stroke-linejoin="round" :d="path" />
  </svg>
</template>
