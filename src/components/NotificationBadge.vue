<script setup lang="ts">
/**
 * The unread badge, in one place. `text` is `notificationBadgeText(count)`;
 * empty renders nothing. `corner` sits on a control's corner (the caller
 * positions it with a class); `pill` sits inline in a row. Decorative: the
 * count is in the control's accessible name. Internal.
 */
withDefaults(
  defineProps<{
    text: string;
    variant?: "corner" | "pill";
  }>(),
  { variant: "corner" },
);
</script>

<template>
  <span
    v-if="text"
    aria-hidden="true"
    :class="[
      'rounded-full bg-badge text-center font-semibold text-white',
      variant === 'corner'
        ? 'absolute min-w-4 px-1 text-[10px] leading-4'
        : 'min-w-5 px-1.5 text-xs leading-5',
    ]"
  >
    {{ text }}
  </span>
</template>
