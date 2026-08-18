<script setup lang="ts">
/**
 * One footer for the whole network.
 *
 * ## What it replaces
 *
 * Two hand-maintained copies (can-web's and can-dev's) and five sites with no
 * footer at all. The two copies had already drifted into different column
 * sets, and both carried the same broken link: the GitHub URL contained a
 * space — the wreckage of the AirwaySN → Cerulean rename — and shipped on
 * every page of both sites, because nothing checks a string that happens to be
 * a URL. It is fixed once here, in `COMMUNITY_LINKS`.
 *
 * ## What is *not* in it any more, on purpose
 *
 * The old footer listed can-web's own pages — 排行榜, 名册, 活动, 下载, 飞行计划,
 * 统计. Every one of those is already in that site's header or sidebar, one
 * click away, and repeating them at the bottom of the page does not make them
 * easier to find: it makes the footer long enough that the things which are
 * *only* here get lost in it. A footer's job is the things no other control
 * offers — the other sites, the community, the legal line.
 *
 * A site with a genuine exception passes `#extra` and gets one more column.
 *
 * ## Ordering
 *
 * Columns come from `sitesBySection`, so they match the network menu and the
 * command palette entry for entry. A member who learned the shape of the menu
 * already knows the shape of this.
 */
import { computed } from "vue";
import {
  communityLinks,
  sectionHeadings,
  sitesBySection,
  type SiteKey,
} from "../sites";

const props = withDefaults(
  defineProps<{
    /** Active locale code, e.g. `zh-cn`. */
    locale: string;
    /** The site rendering this, so it drops itself from the columns. */
    current?: SiteKey;
    rating?: number;
    signedIn?: boolean;
    /** Logo source. A URL on the rendering site — each serves its own copy. */
    logoSrc?: string;
    /** First year in the copyright line. */
    since?: number;
  }>(),
  { signedIn: false, logoSrc: "/logo.png", since: 2025 },
);

const headings = computed(() => sectionHeadings(props.locale));
const community = computed(() => communityLinks(props.locale));

/**
 * The current site is dropped rather than marked. In a menu "you are here" is
 * useful; in a footer it is a link that does nothing.
 */
const columns = computed(() =>
  sitesBySection({
    locale: props.locale,
    current: props.current,
    rating: props.rating,
    signedIn: props.signedIn,
    excludeCurrent: true,
  }),
);
</script>

<template>
  <footer class="border-t border-subtle bg-surface-sunken">
    <div class="mx-auto max-w-7xl px-4 pb-10 pt-16 sm:px-6 lg:px-8 lg:pt-20">
      <div class="grid gap-12 lg:grid-cols-3 lg:gap-8">
        <div class="max-w-sm space-y-6">
          <img
            :src="logoSrc"
            alt="Cerulean Aviation Network"
            class="h-10 w-auto"
          />
          <p class="text-sm leading-6 text-muted">{{ headings.description }}</p>
        </div>

        <div class="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-2">
          <div v-for="column in columns" :key="column.section">
            <h3
              class="text-xs font-semibold uppercase tracking-widest text-faint"
            >
              {{ headings[column.section] }}
            </h3>
            <!--
              py-1.5 keeps these above a thumb-sized tap target on a phone,
              where a 14px line is otherwise 17px tall.
            -->
            <ul role="list" class="mt-3 space-y-0.5">
              <li v-for="site in column.sites" :key="site.key">
                <a
                  :href="site.href"
                  class="inline-block py-1.5 text-sm text-muted transition-colors hover:text-can"
                >
                  {{ site.name }}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3
              class="text-xs font-semibold uppercase tracking-widest text-faint"
            >
              {{ headings.community }}
            </h3>
            <ul role="list" class="mt-3 space-y-0.5">
              <li v-for="link in community" :key="link.key">
                <a
                  :href="link.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-block py-1.5 text-sm text-muted transition-colors hover:text-can"
                >
                  {{ link.name }}
                </a>
              </li>
            </ul>
          </div>

          <slot name="extra" />
        </div>
      </div>

      <div
        class="mt-14 flex flex-col gap-2 border-t border-subtle pt-8 sm:flex-row sm:items-center sm:justify-between"
      >
        <p class="text-sm text-faint">
          &copy; {{ since }} Cerulean Aviation Network. All rights reserved.
        </p>
        <p class="text-sm text-faint">
          Powered by
          <a
            href="https://jianyuelab.org"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-block py-1 font-semibold text-muted transition-colors hover:text-can"
          >
            JianyueLab
          </a>
        </p>
      </div>
    </div>
  </footer>
</template>
