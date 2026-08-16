<script setup lang="ts">
/**
 * Theme and language in one control.
 *
 * **This is the single most duplicated file on the network** — 243 lines,
 * byte-identical in all six sites. It is also the one nobody would notice
 * drifting: a language menu that renders three locales on one site and four on
 * another is a bug that only shows up if you visit both.
 *
 * These used to be two separate buttons fixed to the bottom-right corner,
 * floating over page content, which forced every footer to carry an
 * `sm:pr-16` escape hatch to get out of their way. Now they sit inline in the
 * header; `variant="floating"` survives for the chrome-less credential pages,
 * as a single compact pill rather than a stack.
 *
 * The theme half is **never** optional. A site that respects
 * `prefers-color-scheme` but offers no way to override it is a site whose dark
 * mode you cannot turn off.
 */
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import Icon from "./Icon.vue";
import { useTheme, THEME_ICONS } from "../composables/useTheme";
import {
  createTranslator,
  CHROME_MESSAGES,
  LANGUAGES,
  type LanguageOption,
} from "../i18n";

const props = withDefaults(
  defineProps<{
    /** Active locale code, e.g. `zh-cn`. */
    locale: string;
    variant?: "inline" | "floating";
    /**
     * Offer the language menu at all.
     *
     * Off for a surface with one language, where a picker whose every entry
     * lands you back on the same page reads as broken rather than as absent.
     */
    languages?: boolean;
    /** Override the offered locales. */
    options?: LanguageOption[];
    /**
     * Cookie the locale is stored in.
     *
     * `NEXT_LOCALE` is Next.js-era naming that survived the Astro migration
     * and is current, not dead — every site's server-side render reads it.
     * It is a prop because a design system hardcoding another system's cookie
     * name is how a package quietly stops being reusable.
     */
    cookieName?: string;
    messages?: Record<string, unknown>;
  }>(),
  {
    variant: "inline",
    languages: true,
    cookieName: "NEXT_LOCALE",
    messages: () => ({}),
  },
);

const emit = defineEmits<{
  /**
   * A locale was chosen. Handle it to take over navigation; the default —
   * set the cookie and reload — runs only when nothing is listening.
   */
  language: [string];
}>();

const t = createTranslator(props.messages, CHROME_MESSAGES);
const { mode, cycle } = useTheme();

const themeLabel = computed(
  () => `${t("theme.label")}: ${t(`theme.${mode.value}`)}`,
);

const offered = computed(() => props.options ?? LANGUAGES);
const current = computed(
  () => offered.value.find((l) => l.code === props.locale) ?? offered.value[0],
);

const mounted = ref(false);
const menuOpen = ref(false);
const root = ref<HTMLElement | null>(null);

function onCycleTheme(event: MouseEvent) {
  cycle(event);
}

function changeLanguage(next: string) {
  menuOpen.value = false;
  if (next === props.locale) return;
  emit("language", next);
  // A full reload rather than a client-side swap, because the locale is read
  // server-side: the page's own markup, its `lang` attribute and every
  // server-rendered string come from that cookie, and none of them are Vue's
  // to change.
  document.cookie = `${props.cookieName}=${next};path=/;max-age=31536000;samesite=lax`;
  window.location.reload();
}

function onDocumentClick(event: MouseEvent) {
  if (!root.value?.contains(event.target as Node)) menuOpen.value = false;
}
function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") menuOpen.value = false;
}

onMounted(() => {
  mounted.value = true;
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onKeydown);
});
onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onKeydown);
});

// `.icon-button` carries the size, the hover and — on a coarse pointer —
// the 44px floor these two used to miss entirely at 36px.
const buttonClass = "icon-button";
</script>

<template>
  <!-- `relative` belongs to the inline variant *only*. Listing it
       unconditionally alongside the floating variant's `fixed` puts both
       position utilities on one element, and Tailwind emits `.relative` after
       `.fixed`, so `relative` wins: the "floating" control lands in normal
       flow and adds its own height to the document. On the credential pages
       that scrolled the page by ~46px and opened a strip of bare surface under
       the full-height artwork. Either value establishes a containing block, so
       the menu below still anchors correctly. -->
  <div
    ref="root"
    :class="[
      'flex items-center',
      variant === 'floating'
        ? 'material-thin fixed bottom-4 right-4 z-50 gap-0.5 rounded-full border border-subtle p-1 shadow-popover'
        : 'relative gap-0.5',
    ]"
  >
    <button
      type="button"
      :class="buttonClass"
      :aria-label="themeLabel"
      :title="themeLabel"
      @click="onCycleTheme"
    >
      <!-- Only the glyph waits for hydration, not the control. The server
           cannot read localStorage, so any icon it renders is a guess that is
           wrong for everybody who has chosen anything — but hiding the whole
           control until mount, which is what this used to do, costs a layout
           shift in a sticky header instead. The box is a fixed square. -->
      <Icon v-if="mounted" :name="THEME_ICONS[mode]" class="size-5" />
    </button>

    <span class="sr-only" role="status" aria-live="polite">
      {{ mounted ? themeLabel : "" }}
    </span>

    <button
      v-if="languages"
      type="button"
      :class="[buttonClass, menuOpen ? 'bg-surface-sunken text-ink' : '']"
      :aria-label="t('language.label')"
      :aria-expanded="menuOpen"
      aria-haspopup="menu"
      @click="menuOpen = !menuOpen"
    >
      <span class="text-xs font-semibold tracking-tight">
        {{ current?.short }}
      </span>
    </button>

    <div
      v-if="languages && menuOpen"
      role="menu"
      :class="[
        'animate-panel-in absolute right-0 z-50 w-40 overflow-hidden rounded-card border border-subtle bg-surface-overlay py-1 shadow-popover',
        variant === 'floating' ? 'bottom-full mb-2' : 'top-full mt-2',
      ]"
      :style="{
        '--origin-x': '100%',
        '--origin-y': variant === 'floating' ? '100%' : '0%',
      }"
    >
      <button
        v-for="language in offered"
        :key="language.code"
        role="menuitem"
        :class="[
          'tap-row flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors',
          language.code === locale
            ? 'font-semibold text-airwaysn'
            : 'text-muted hover:bg-surface-sunken hover:text-ink',
        ]"
        @click="changeLanguage(language.code)"
      >
        <!-- Language names are endonyms and are never translated: somebody
             looking for their own language is looking for the word they would
             write, not for its name in a language they cannot read. -->
        <span class="w-6 shrink-0 text-center text-xs font-semibold text-faint">
          {{ language.short }}
        </span>
        <span class="truncate">{{ language.name }}</span>
        <Icon
          v-if="language.code === locale"
          name="checkCircle"
          class="ml-auto size-4"
        />
      </button>
    </div>
  </div>
</template>
