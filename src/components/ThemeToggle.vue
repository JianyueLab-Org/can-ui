<script setup lang="ts">
/**
 * Light / dark switch, on its own.
 *
 * Use this where there is no language to switch. Where there is, use
 * ThemeLangControls, which is this plus the language menu in one control —
 * two separate floating buttons is what the sites had before, and it forced
 * every footer to carry an `sm:pr-16` escape hatch to get out of their way.
 *
 * The wipe, the fallbacks and the reasoning for persisting before animating
 * all live in `useTheme` — this component is the button, not the behaviour,
 * which is what lets ThemeLangControls reuse it without a second copy.
 */
import Icon from "./Icon.vue";
import { useIsDark, toggleTheme } from "../composables/useTheme";
import { createTranslator, CHROME_MESSAGES } from "../i18n";

const props = withDefaults(
  defineProps<{
    /** Site dictionary; falls back to can-ui's English chrome strings. */
    messages?: Record<string, unknown>;
  }>(),
  { messages: () => ({}) },
);

const isDark = useIsDark();
const t = createTranslator(props.messages, CHROME_MESSAGES);

function onClick(event: MouseEvent) {
  toggleTheme(event, isDark.value);
}
</script>

<template>
  <button
    type="button"
    class="btn btn-ghost size-9 p-0"
    :aria-label="isDark ? t('theme.toLight') : t('theme.toDark')"
    :title="isDark ? t('theme.toLight') : t('theme.toDark')"
    :aria-pressed="isDark"
    @click="onClick"
  >
    <Icon :name="isDark ? 'sun' : 'moon'" class="size-5" />
  </button>
</template>
