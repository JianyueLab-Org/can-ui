<script setup lang="ts">
/**
 * The full lockup — mark plus wordmark.
 *
 * **The call site never picks black or white.** That is the whole reason this
 * component exists rather than an `<img>` at each site. The artwork ships as
 * twelve files: two orientations × three wordmarks × a black and a white
 * version, and the black/white pair differ *only* in the wordmark's fill —
 * the mark keeps its two brand blues in both. Asking every header to choose
 * is asking every header to get it wrong the first time somebody adds dark
 * mode, and it is a choice with exactly one correct answer at any moment.
 * So this reads the theme and swaps.
 *
 * **Why files and not inline SVG.** A wordmark is CJK text converted to
 * outlines: 5.9 KB for Chinese, 18.7 KB for Chinese + English, in one path.
 * Inlining that puts a picture of some text into every page's JavaScript.
 * The mark on its own is 1.4 KB and *is* inlined — see LogoMark.
 *
 * **Why not one `currentColor` file instead of a black/white pair.** Because
 * an external SVG in an `<img>` cannot inherit `currentColor`, and a CSS
 * `mask-image` would flatten the two-tone mark to a single colour. The
 * adaptive files exist for the case where the whole lockup genuinely has to
 * take an arbitrary colour — over a photograph, in a single-colour print —
 * and they are inlined by hand there, not used here.
 *
 * Size it by height: `class="h-8 w-auto"`. The aspect ratios differ by
 * variant, so a fixed width would squash one of them.
 */
import { computed } from "vue";
import { useIsDark } from "../composables/useTheme";

// Static imports rather than a runtime path: Vite emits each file with a
// content hash and rewrites the URL, so this works unchanged in every
// consuming site's build with no asset-copying step to forget. Sites must
// already carry `ssr.noExternal: ["can-ui"]`, which is what lets their Vite
// process these at all.
import hBC from "../assets/logo/CAN-H-B-C.svg?url";
import hBCE from "../assets/logo/CAN-H-B-CE.svg?url";
import hBE from "../assets/logo/CAN-H-B-E.svg?url";
import hWC from "../assets/logo/CAN-H-W-C.svg?url";
import hWCE from "../assets/logo/CAN-H-W-CE.svg?url";
import hWE from "../assets/logo/CAN-H-W-E.svg?url";
import vBC from "../assets/logo/CAN-V-B-C.svg?url";
import vBCE from "../assets/logo/CAN-V-B-CE.svg?url";
import vBE from "../assets/logo/CAN-V-B-E.svg?url";
import vWC from "../assets/logo/CAN-V-W-C.svg?url";
import vWCE from "../assets/logo/CAN-V-W-CE.svg?url";
import vWE from "../assets/logo/CAN-V-W-E.svg?url";

const props = withDefaults(
  defineProps<{
    /** `h` sets the wordmark beside the mark; `v` stacks it underneath. */
    orientation?: "h" | "v";
    /** Which wordmark: Chinese, Chinese over English, or English. */
    wordmark?: "zh" | "zh-en" | "en";
    /**
     * Force a wordmark colour instead of following the theme.
     *
     * For a lockup that sits on something whose brightness the theme does not
     * describe — white text over a photographic hero, black on a printed
     * page. Leaving it unset is right almost everywhere.
     */
    tone?: "auto" | "black" | "white";
    /** Accessible name; pass `""` when adjacent text already names the site. */
    alt?: string;
  }>(),
  {
    orientation: "h",
    wordmark: "zh-en",
    tone: "auto",
    alt: "Cerulean Aviation Network",
  },
);

const isDark = useIsDark();

const SOURCES = {
  h: {
    black: { zh: hBC, "zh-en": hBCE, en: hBE },
    white: { zh: hWC, "zh-en": hWCE, en: hWE },
  },
  v: {
    black: { zh: vBC, "zh-en": vBCE, en: vBE },
    white: { zh: vWC, "zh-en": vWCE, en: vWE },
  },
} as const;

/**
 * `tone="auto"` ships **both** inks and lets CSS pick.
 *
 * Reading the theme in JS is a frame too late. Astro renders this island on
 * the server, where there is no `.dark` class to read, so SSR always emitted
 * the black wordmark — and a member on a dark page saw black-on-black until
 * the island hydrated. That is precisely the flash `ThemeScript.astro` exists
 * to prevent, reintroduced for the one element that carries the brand.
 *
 * Two `<img>` and a `dark:` variant are correct on the *first* paint, because
 * `.dark` is already on `<html>` before the first byte of body is painted. The
 * cost is one extra request, and only for the lockup that is not shown — the
 * browser fetches both, but each is a few KB of SVG and one of them is
 * `display: none`, so it is not on the critical path either way.
 *
 * `<picture>` with `prefers-color-scheme` would be tempting and is wrong: it
 * follows the *system*, and this theme has three modes where an explicit
 * light/dark choice must beat the system.
 *
 * `isDark` is still read, but only so an explicit `tone` keeps working and so
 * the ref stays installed for anything else observing it.
 */
const blackSrc = computed(
  () => SOURCES[props.orientation].black[props.wordmark],
);
const whiteSrc = computed(
  () => SOURCES[props.orientation].white[props.wordmark],
);
const src = computed(() => {
  const ink =
    props.tone === "auto" ? (isDark.value ? "white" : "black") : props.tone;
  return SOURCES[props.orientation][ink][props.wordmark];
});
</script>

<template>
  <!-- One root, so a call site's `class="h-10 w-auto"` still lands somewhere
       sensible; the images take their height from it. An explicit `tone` keeps
       the single-image shape, because then there is nothing to choose. -->
  <span
    v-if="tone === 'auto'"
    class="inline-flex h-8 w-auto items-center"
    :aria-hidden="alt ? undefined : true"
  >
    <img
      :src="blackSrc"
      :alt="alt"
      class="h-full w-auto dark:hidden"
      decoding="async"
    />
    <img
      :src="whiteSrc"
      :alt="alt"
      class="hidden h-full w-auto dark:block"
      decoding="async"
    />
  </span>
  <img
    v-else
    :src="src"
    :alt="alt"
    class="h-8 w-auto"
    decoding="async"
    :aria-hidden="alt ? undefined : true"
  />
</template>
