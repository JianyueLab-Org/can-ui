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
import { computed, ref, useAttrs } from "vue";
import Icon from "./Icon.vue";
import type { IconName } from "../icons";
import { usePress } from "../composables/usePress";

// The click listener has to be read off `$attrs`, and a listener can only
// reach `$attrs` if it is *not* declared in `defineEmits` — a declared emit is
// stripped from them. So `click` is deliberately undeclared here, and the
// handler is forwarded by hand below. Attribute inheritance is off for the
// same reason: the root element takes everything except `onClick`, which is
// wrapped so `disabled` can suppress it.
defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    label?: string;
    description?: string;
    /** ICON_PATHS key rendered at the leading edge. */
    icon?: IconName;
    /** Short value shown at the trailing edge. */
    value?: string | number;
    href?: string;
    /**
     * Force the chevron on or off. Defaults to on for `href` rows — the ones
     * that genuinely lead somewhere — and off otherwise, so a menu row that
     * runs an action does not claim to navigate.
     */
    chevron?: boolean;
    disabled?: boolean;
    /** Renders the label in the danger colour — for a destructive row. */
    destructive?: boolean;
  }>(),
  { disabled: false, destructive: false },
);

type ClickListener = (event: MouseEvent) => void;

const attrs = useAttrs();

/** Everything the root element should take verbatim — `onClick` excepted. */
const forwarded = computed(() => {
  const { onClick: _onClick, ...rest } = attrs;
  return rest;
});

const el = ref<HTMLElement | null>(null);

/**
 * A row is interactive when it navigates *or* when it does something.
 *
 * `chevron` used to stand in for the second half, because a declared `click`
 * emit is stripped from `$attrs` and there was no other way to see a listener.
 * The result was that `<ListRow label="…" @click="…" />` — the shape the
 * header comment above promises renders a `<button>` — rendered a plain
 * `<div>`: it fired on a mouse click and was unreachable by every other route,
 * with no `tabindex`, no role, no Enter/Space, and `usePress` disabled too.
 * `chevron` is still honoured so that a row given one deliberately still reads
 * as pressable.
 */
const interactive = computed(
  () => !!props.href || !!attrs.onClick || !!props.chevron,
);
const { pressed } = usePress(el, {
  disabled: () => props.disabled || !interactive.value,
});

const tag = computed(() => {
  if (props.href) return "a";
  return interactive.value ? "button" : "div";
});
const showChevron = computed(() => props.chevron ?? !!props.href);

function onActivate(event: MouseEvent) {
  // `<button disabled>` blocks this natively, but an `<a>` carrying only
  // `aria-disabled` does not — it would still navigate and still call the
  // handler.
  if (props.disabled) {
    event.preventDefault();
    return;
  }
  const listener = attrs.onClick as ClickListener | ClickListener[] | undefined;
  if (Array.isArray(listener)) listener.forEach((fn) => fn(event));
  else listener?.(event);
}
</script>

<template>
  <component
    :is="tag"
    ref="el"
    v-bind="forwarded"
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
    @click="onActivate"
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
