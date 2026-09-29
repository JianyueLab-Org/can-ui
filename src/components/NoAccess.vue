<script setup lang="ts">
/**
 * "No access", rendered inside the frame on the requested URL.
 *
 * The site sets the status: `Astro.response.status = 403`. The component
 * explains the refusal, shows who is signed in, holds the site's guidance in
 * `next-steps`, and lists the sites the member can still use.
 */
import { computed, useId } from "vue";
import Icon from "./Icon.vue";
import { CHROME_MESSAGES, createTranslator } from "../i18n";
import { noAccessText, reachableSites, type NoAccessReason } from "../frame";
import type { SiteKey, SiteOrigins } from "../sites";

const props = withDefaults(
  defineProps<{
    reason: NoAccessReason;
    userName: string;
    userId: string | number;
    /** The site rendering this; dropped from the list. */
    current: SiteKey;
    locale: string;
    rating?: number;
    messages?: Record<string, unknown>;
    origins?: SiteOrigins;
  }>(),
  { rating: undefined, messages: () => ({}), origins: undefined },
);

const t = createTranslator(props.messages, CHROME_MESSAGES);
const headingId = useId();

const detail = computed(() => {
  const { key, values } = noAccessText(props.reason);
  return t(key, values);
});

const sites = computed(() =>
  reachableSites({
    current: props.current,
    locale: props.locale,
    rating: props.rating,
    origins: props.origins,
  }),
);
</script>

<template>
  <section
    class="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-12 sm:py-16"
    :aria-labelledby="headingId"
  >
    <div class="flex flex-col gap-3">
      <span
        class="flex size-12 items-center justify-center rounded-full bg-surface-sunken text-muted"
      >
        <Icon name="shieldCheck" class="size-6" />
      </span>
      <h1 :id="headingId" class="text-2xl font-semibold text-ink">
        {{ t("noAccess.title") }}
      </h1>
      <p class="text-muted">{{ detail }}</p>
      <p class="text-sm text-faint">
        {{ t("noAccess.signedInAs", { name: userName, id: userId }) }}
      </p>
    </div>

    <div v-if="$slots['next-steps']">
      <slot name="next-steps" />
    </div>

    <div v-if="sites.length">
      <h2 class="text-sm font-semibold text-ink">
        {{ t("noAccess.reachable") }}
      </h2>
      <ul class="mt-3 grid gap-2 sm:grid-cols-2">
        <li v-for="site in sites" :key="site.key">
          <a
            :href="site.href"
            class="focus-ring flex items-start gap-3 rounded-card border border-subtle bg-surface-raised px-3 py-2.5 transition-colors hover:border-strong"
          >
            <Icon :name="site.icon" class="mt-0.5 size-5 shrink-0 text-can" />
            <span class="min-w-0">
              <span class="block truncate text-sm font-medium text-ink">
                {{ site.name }}
              </span>
              <span class="block truncate text-xs text-faint">
                {{ site.tagline }}
              </span>
            </span>
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>
