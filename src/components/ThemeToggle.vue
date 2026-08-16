<script setup lang="ts">
/**
 * Appearance, on its own — light → dark → follow system, one control.
 *
 * Use this where there is no language to switch. Where there is, use
 * ThemeLangControls, which is this plus the language menu; two separate
 * floating buttons is what the sites had before, and it forced every footer to
 * carry an `sm:pr-16` escape hatch to get out of their way.
 *
 * **It cycles three ways rather than toggling two.** A two-state switch has a
 * trapdoor: the first tap writes a preference that can never be taken back, so
 * a member who once tried dark mode is pinned to it while their phone goes on
 * switching at sunset around them. The order — light, dark, system — puts the
 * two explicit choices first, so the common tap still flips the appearance
 * immediately, and leaves `system` where somebody looking for it will reach it
 * by pressing again.
 *
 * The wipe, the fallbacks and the reasoning for persisting before animating
 * all live in `useTheme` — this component is the button, not the behaviour,
 * which is what lets ThemeLangControls reuse it without a second copy.
 */
import { computed, onMounted, ref } from "vue";
import Icon from "./Icon.vue";
import { useTheme, THEME_ICONS } from "../composables/useTheme";
import { createTranslator, CHROME_MESSAGES } from "../i18n";

const props = withDefaults(
  defineProps<{
    /** Site dictionary; falls back to can-ui's English chrome strings. */
    messages?: Record<string, unknown>;
  }>(),
  { messages: () => ({}) },
);

const { mode, cycle } = useTheme();
const t = createTranslator(props.messages, CHROME_MESSAGES);

// The button keeps its box before hydration but not its glyph. Rendering an
// icon on the server means rendering a *guess* — the server cannot read
// localStorage — and the guess is wrong for everybody who has chosen anything,
// so the first paint shows one appearance and the second shows another. The
// alternative that ThemeLangControls used to take, hiding the whole control,
// costs a layout shift in a sticky header instead. `.icon-button` is a fixed
// square, so holding the box costs nothing.
const mounted = ref(false);
onMounted(() => (mounted.value = true));

const label = computed(
  () => `${t("theme.label")}: ${t(`theme.${mode.value}`)}`,
);
</script>

<template>
  <button
    type="button"
    class="icon-button"
    :aria-label="label"
    :title="label"
    @click="cycle"
  >
    <Icon v-if="mounted" :name="THEME_ICONS[mode]" class="size-5" />
  </button>

  <!-- Cycling through three states with one button gives a screen reader no
       confirmation of where it landed — the accessible name changes, but a
       name change is not announced. This is. -->
  <span class="sr-only" role="status" aria-live="polite">
    {{ mounted ? label : "" }}
  </span>
</template>
