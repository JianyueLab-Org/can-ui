<script setup lang="ts">
/**
 * "Everywhere else on the network" — one menu, identical on every site.
 *
 * The section switcher answers *which seat am I in* and covers three
 * destinations. This answers *what else is there*, and covers the rest. Before
 * it existed the answer depended on which host you happened to be on: the exam
 * centre offered one other site, the radar offered none, and the flight bag
 * could not reach the documentation at all. Knowing a hostname was a
 * prerequisite for using the network.
 *
 * **It renders whatever `visibleSites` hands back and decides nothing.** The
 * rating hint, the public/members-only split and the ordering all live in
 * `sites.ts`, so a member sees the same list here as in the footer and the
 * command palette. A component that filtered on its own would be a fourth
 * opinion about what the network contains.
 *
 * **Every row carries a tagline.** A menu of nine product names is a quiz —
 * "电子飞行包" does not tell somebody who has never opened it that their flight
 * plan is in there. The second line is the part that makes the menu navigable
 * by people who are not already fluent in the network's vocabulary, which is
 * exactly the population a cross-site menu exists for.
 */
import { computed } from "vue";
import Icon from "./Icon.vue";
import Popover from "./Popover.vue";
import { sectionHeadings, visibleSites, type SiteKey } from "../sites";

const props = withDefaults(
  defineProps<{
    /** Active locale code, e.g. `zh-cn`. */
    locale: string;
    /** The site rendering this, so it can drop itself from its own menu. */
    current?: SiteKey;
    /** Session rating, for the gated entries. */
    rating?: number;
    signedIn?: boolean;
    /**
     * Keys already reachable from somewhere else in this header.
     *
     * Sites that draw the three-section switcher pass those three, so the menu
     * is the complement of the switcher rather than a second copy of it. Sites
     * with no switcher pass nothing and get the whole network.
     */
    exclude?: SiteKey[];
    /**
     * Trigger label. Defaults to the locale's word for the network.
     *
     * A site can override it, but should not need to: the control names the
     * *network*, and one that reads 全网 on one host and 更多 on the next is
     * two controls as far as a member is concerned.
     */
    label?: string;
    /** Compact trigger — icon only, for a crowded bar. */
    compact?: boolean;
  }>(),
  { signedIn: false, exclude: () => [], compact: false },
);

const triggerLabel = computed(
  () => props.label ?? sectionHeadings(props.locale).menuLabel,
);

const sites = computed(() => {
  const hidden = new Set<SiteKey>(props.exclude);
  return visibleSites({
    locale: props.locale,
    current: props.current,
    rating: props.rating,
    signedIn: props.signedIn,
    excludeCurrent: true,
  }).filter((site) => !hidden.has(site.key));
});
</script>

<template>
  <!--
    Rendered only when there is somewhere to go. An empty menu that opens onto
    nothing is worse than an absent one: it costs a click to learn the same
    thing. Signed out on the radar, for example, this is one entry.
  -->
  <Popover
    v-if="sites.length"
    placement="bottom-end"
    width="19rem"
    :label="triggerLabel"
  >
    <template #trigger="{ toggle, open }">
      <button
        type="button"
        class="flex items-center gap-1.5 rounded-control px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-ink"
        :aria-expanded="open"
        aria-haspopup="menu"
        @click="toggle"
      >
        <Icon name="squaresPlus" class="size-5" />
        <span :class="compact ? 'sr-only' : ''">{{ triggerLabel }}</span>
        <Icon
          v-if="!compact"
          name="chevronDown"
          class="size-4 transition-transform"
          :class="open ? 'rotate-180' : ''"
        />
      </button>
    </template>

    <ul role="menu" class="space-y-0.5 p-1.5">
      <li v-for="site in sites" :key="site.key" role="none">
        <a
          :href="site.href"
          role="menuitem"
          class="flex items-start gap-3 rounded-control px-2.5 py-2 transition-colors hover:bg-surface-raised"
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
  </Popover>
</template>
