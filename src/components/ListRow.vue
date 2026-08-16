<script setup lang="ts">
/**
 * One row of a ListGroup.
 *
 * Renders as a `<button>`, an `<a>` or a plain `<div>` depending on what it
 * does, which is the point: a row that navigates must be a link so it can be
 * opened in a new tab, focused and read as a link; a row that only holds a
 * switch must not be a button, or the screen reader announces a control that
 * does nothing. Passing `href` or listening for `@click` picks the element.
 *
 * The chevron appears only on rows that lead somewhere. It is the one piece of
 * wayfinding a list of this shape has — without it there is no way to tell a
 * row that opens a page from a row that is just displaying a value.
 */
import { computed, ref } from "vue";
import Icon from "./Icon.vue";
import { usePress } from "../composables/usePress";

const props = withDefaults(
  defineProps<{
    label?: string;
    description?: string;
    /** ICON_PATHS key rendered at the leading edge. */
    icon?: string;
    /** Short value shown at the trailing edge. */
    value?: string | number;
    href?: string;
    /** Force the chevron on or off; defaults to on for links and buttons. */
    chevron?: boolean;
    disabled?: boolean;
    /** Renders the label in the danger colour — for a destructive row. */
    destructive?: boolean;
  }>(),
  { disabled: false, destructive: false },
);

const emit = defineEmits<{ (e: "click", event: MouseEvent): void }>();

const el = ref<HTMLElement | null>(null);
const interactive = computed(() => !!props.href || !!props.chevron);
const { pressed } = usePress(el, {
  disabled: () => props.disabled || !interactive.value,
});

const tag = computed(() => {
  if (props.href) return "a";
  return interactive.value ? "button" : "div";
});
const showChevron = computed(() => props.chevron ?? !!props.href);
</script>

<template>
  <component
    :is="tag"
    ref="el"
    :href="href"
    :type="tag === 'button' ? 'button' : undefined"
    :disabled="tag === 'button' && disabled ? true : undefined"
    :aria-disabled="tag === 'a' && disabled ? 'true' : undefined"
    :class="[
      'tap-row flex w-full items-center gap-3 px-4 py-3 text-left',
      interactive ? 'cursor-pointer' : '',
      disabled ? 'cursor-not-allowed opacity-50' : '',
      // Pressed state is a background rather than a scale: a row is flush
      // against its neighbours, and scaling one would open a visible gap
      // above and below it.
      pressed ? 'bg-surface-sunken' : '',
      interactive && !disabled ? 'hover:bg-surface-sunken' : '',
    ]"
    @click="!disabled && emit('click', $event)"
  >
    <span
      v-if="icon"
      class="flex size-7 shrink-0 items-center justify-center rounded-control bg-surface-sunken text-muted"
    >
      <Icon :name="icon" class="size-4" />
    </span>

    <span class="min-w-0 flex-1">
      <span
        :class="[
          'block truncate text-sm font-medium',
          destructive ? 'text-danger' : 'text-ink',
        ]"
      >
        <slot>{{ label }}</slot>
      </span>
      <span
        v-if="description || $slots.description"
        class="mt-0.5 block text-xs text-muted"
      >
        <slot name="description">{{ description }}</slot>
      </span>
    </span>

    <span
      v-if="value !== undefined || $slots.trailing"
      class="flex shrink-0 items-center gap-2 text-sm text-muted"
    >
      <slot name="trailing">{{ value }}</slot>
    </span>

    <Icon
      v-if="showChevron"
      name="chevronRight"
      class="size-4 shrink-0 text-faint"
    />
  </component>
</template>
