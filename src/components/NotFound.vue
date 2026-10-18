<script setup lang="ts">
/**
 * "Not found", rendered inside the frame on the requested URL.
 *
 * The site sets the status: `Astro.response.status = 404`. The component
 * shows the code, the title and the description, then links home, to the
 * radar and to the docs. `backdrop` holds a site's photo layer; `actions`
 * holds extra links after the shared ones.
 */
import { computed, useId } from "vue";
import { createTranslator } from "../i18n";
import { notFoundLinks, notFoundText } from "../notFound";
import type { SiteKey, SiteOrigins } from "../sites";

const props = withDefaults(
  defineProps<{
    /** The site rendering this; its own network link is dropped. */
    current: SiteKey;
    locale: string;
    /** This site's root. */
    homeHref?: string;
    /** Overrides any string through `notFound.*`. */
    messages?: Record<string, unknown>;
    origins?: SiteOrigins;
  }>(),
  { homeHref: "/", messages: () => ({}), origins: undefined },
);

const headingId = useId();

const t = computed(() =>
  createTranslator(props.messages, { notFound: notFoundText(props.locale) }),
);

const links = computed(() =>
  notFoundLinks({
    current: props.current,
    locale: props.locale,
    homeHref: props.homeHref,
    origins: props.origins,
  }).map((link) => ({ ...link, label: t.value(`notFound.${link.key}`) })),
);

const VARIANT_CLASS = {
  primary: "btn-primary",
  secondary: "btn-secondary",
  ghost: "btn-ghost",
} as const;
</script>

<template>
  <section
    class="surface-grid relative isolate flex min-h-[60dvh] flex-1 items-center justify-center px-4 py-24"
    :aria-labelledby="headingId"
  >
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-0 bg-gradient-to-b from-surface via-transparent to-surface"
    ></div>
    <slot name="backdrop" />
    <div class="animate-fade-up relative mx-auto max-w-xl text-center">
      <p
        aria-hidden="true"
        class="font-mono text-[7rem] font-bold leading-none tracking-tighter text-can/20 sm:text-[10rem]"
      >
        {{ t("notFound.code") }}
      </p>
      <h1
        :id="headingId"
        class="-mt-6 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
      >
        {{ t("notFound.title") }}
      </h1>
      <p class="mx-auto mt-4 max-w-md text-muted">
        {{ t("notFound.description") }}
      </p>
      <div class="mt-8 flex flex-wrap items-center justify-center gap-3">
        <a
          v-for="link in links"
          :key="link.key"
          :href="link.href"
          class="btn px-5 py-2.5"
          :class="VARIANT_CLASS[link.variant]"
        >
          {{ link.label }}
        </a>
        <slot name="actions" />
      </div>
    </div>
  </section>
</template>
