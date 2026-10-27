<script setup lang="ts">
/**
 * The network switcher — one menu, identical on every site.
 *
 * The trigger names the page the member is on; the panel lists the network
 * grouped by audience. It renders whatever `networkGroups` hands back and
 * decides nothing: visibility, grouping and order live in `networkLinks.ts`.
 *
 * Every row carries a tagline, because a product name alone does not tell a
 * member what is inside.
 */
import { computed } from "vue";
import Icon from "./Icon.vue";
import Popover from "./Popover.vue";
import { currentEntryName, networkGroups } from "../networkLinks";
import { sectionHeadings, type SiteKey, type SiteOrigins } from "../sites";

const props = withDefaults(
  defineProps<{
    /** Active locale code, e.g. `zh-cn`. */
    locale: string;
    /** The site rendering this. Its entry is marked, not dropped. */
    current?: SiteKey;
    /** The current path, so the main site can tell its pilot panel apart. */
    pathname?: string;
    /** Session rating, for the gated entries. */
    rating?: number;
    signedIn?: boolean;
    /** Sites to leave out. No site needs this today. */
    exclude?: SiteKey[];
    /** Trigger label override. Defaults to the current page's entry name. */
    label?: string;
    /** Compact trigger — icon only, for a crowded bar. */
    compact?: boolean;
    /** Dev/staging origin overrides — see `siteUrl` in `sites.ts`. */
    origins?: SiteOrigins;
    /** Where the panel opens. A rail opens it to the right, downward. */
    placement?: "bottom-start" | "bottom-end" | "top-start" | "top-end";
  }>(),
  {
    signedIn: false,
    exclude: () => [],
    compact: false,
    placement: "bottom-end",
  },
);

const triggerLabel = computed(() => {
  if (props.label) return props.label;
  if (props.current) {
    return currentEntryName({
      locale: props.locale,
      current: props.current,
      pathname: props.pathname,
    });
  }
  return sectionHeadings(props.locale).menuLabel;
});

const groups = computed(() => {
  const hidden = new Set<SiteKey>(props.exclude);
  return networkGroups({
    locale: props.locale,
    current: props.current,
    pathname: props.pathname,
    rating: props.rating,
    signedIn: props.signedIn,
    origins: props.origins,
  })
    .map((group) => ({
      ...group,
      entries: group.entries.filter((entry) => !hidden.has(entry.site)),
    }))
    .filter((group) => group.entries.length > 0);
});
</script>

<template>
  <Popover
    v-if="groups.length"
    :placement="placement"
    width="20rem"
    :label="sectionHeadings(locale).menuLabel"
  >
    <template #trigger="{ toggle, open }">
      <button
        type="button"
        class="focus-ring flex items-center gap-1.5 rounded-control px-2.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken"
        :aria-expanded="open"
        aria-haspopup="menu"
        @click="toggle"
      >
        <Icon v-if="compact" name="squaresPlus" class="size-5" />
        <span :class="compact ? 'sr-only' : ''">{{ triggerLabel }}</span>
        <Icon
          v-if="!compact"
          name="chevronDown"
          class="size-4 text-muted transition-transform"
          :class="open ? 'rotate-180' : ''"
        />
      </button>
    </template>

    <div role="menu" class="p-1.5">
      <div
        v-for="group in groups"
        :key="group.key"
        role="group"
        :aria-labelledby="`network-group-${group.key}`"
        class="py-1 first:pt-0 last:pb-0"
      >
        <p
          :id="`network-group-${group.key}`"
          class="px-2.5 pb-1 pt-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-faint"
        >
          {{ group.heading }}
        </p>
        <a
          v-for="entry in group.entries"
          :key="entry.key"
          :href="entry.href"
          role="menuitem"
          :aria-current="entry.current ? 'page' : undefined"
          class="focus-ring flex items-start gap-3 rounded-control px-2.5 py-2 transition-colors hover:bg-surface-sunken"
          :class="entry.current ? 'bg-surface-sunken' : ''"
        >
          <Icon :name="entry.icon" class="mt-0.5 size-5 shrink-0 text-can" />
          <span class="min-w-0">
            <span class="block truncate text-sm font-medium text-ink">
              {{ entry.name }}
            </span>
            <span class="block truncate text-xs text-faint">
              {{ entry.tagline }}
            </span>
          </span>
        </a>
      </div>
    </div>
  </Popover>
</template>
