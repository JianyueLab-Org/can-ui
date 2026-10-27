<script setup lang="ts">
/**
 * A nav group in the content bar: a button that opens its links in a Popover.
 * Active when any child is the current page.
 */
import { computed } from "vue";
import Icon from "./Icon.vue";
import Popover from "./Popover.vue";
import { isCurrentPath } from "../nav";
import type { FrameLink } from "../frame";

const props = defineProps<{
  name: string;
  items: FrameLink[];
  pathname: string;
}>();

const active = computed(() =>
  props.items.some((item) => isCurrentPath(item.href, props.pathname)),
);
</script>

<template>
  <Popover placement="bottom-start" width="15rem" :label="name">
    <template #trigger="{ toggle, open }">
      <button
        type="button"
        :aria-expanded="open"
        aria-haspopup="menu"
        :class="[
          'focus-ring flex items-center gap-1 rounded-control px-3 py-2 text-sm font-semibold transition-colors',
          active
            ? 'bg-surface-sunken text-can'
            : 'text-muted hover:bg-surface-sunken hover:text-ink',
        ]"
        @click="toggle"
      >
        {{ name }}
        <Icon
          name="chevronDown"
          class="size-4 transition-transform"
          :class="open ? 'rotate-180' : ''"
        />
      </button>
    </template>
    <div role="menu" class="p-1.5">
      <a
        v-for="item in items"
        :key="item.href"
        :href="item.href"
        role="menuitem"
        :aria-current="isCurrentPath(item.href, pathname) ? 'page' : undefined"
        :class="[
          'focus-ring flex items-center gap-3 rounded-control px-2.5 py-2 text-sm font-medium transition-colors hover:bg-surface-sunken',
          isCurrentPath(item.href, pathname)
            ? 'bg-surface-sunken text-can'
            : 'text-ink',
        ]"
      >
        <Icon :name="item.icon" class="size-5 shrink-0 text-can" />
        {{ item.name }}
      </a>
    </div>
  </Popover>
</template>
