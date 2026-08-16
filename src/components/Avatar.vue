<script setup lang="ts">
/**
 * A member, as a small round thing.
 *
 * Falls back to a monogram because this network has no avatar uploads — the
 * initials *are* the avatar for everybody, and a generic silhouette repeated
 * down a roster of forty controllers distinguishes nobody. Two letters do.
 *
 * The monogram is derived, never stored: a name that changes changes it.
 */
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    name?: string;
    /** Image URL. Falls back to the monogram when absent or it fails to load. */
    src?: string;
    size?: "sm" | "md" | "lg";
  }>(),
  { size: "md" },
);

const initials = computed(() => {
  const parts = (props.name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  // Uppercased for Latin scripts; a no-op for CJK, where a single character is
  // already the whole monogram and a second would make it unreadable at 32px.
  return (first + second).toUpperCase();
});

const sizeClass = computed(
  () =>
    ({
      sm: "size-7 text-[0.625rem]",
      md: "size-8 text-xs",
      lg: "size-11 text-sm",
    })[props.size],
);
</script>

<template>
  <span
    :class="[
      'flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-airwaysn font-semibold text-white',
      sizeClass,
    ]"
    :title="name"
  >
    <img
      v-if="src"
      :src="src"
      :alt="name ?? ''"
      class="size-full object-cover"
    />
    <template v-else>{{ initials }}</template>
  </span>
</template>
