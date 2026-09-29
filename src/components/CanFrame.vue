<script setup lang="ts">
/**
 * The network frame — one component on every site.
 *
 * Layouts:
 *
 * - `content` — sticky top bar with the site's own nav, the page, `SiteFooter`.
 * - `tool` — top bar, the site's sidebar below it, compact footer.
 * - `rail` — collapsible side rail; under 768px bottom tabs, ending in ⌘K and
 *   a "Me" tab whose sheet holds the other frame parts. State is
 *   `<html data-rail>`; put `RailScript.astro` in `<head>`. The rail does not
 *   offset the page; the site uses `--rail-current`.
 * - `map` — 56px top bar over full-bleed content, no footer.
 *
 * Every layout carries five parts in this order: brand and `NetworkMenu`, the
 * ⌘K trigger, the `notifications` slot, `ThemeLangControls`, `AccountMenu`.
 * ⌘K and Ctrl+K open the palette everywhere.
 *
 * The frame renders `<main id="main-content">`; the page goes in the default
 * slot. It calls one endpoint, the site's own `/api/v1/auth/signout` (through
 * `AccountMenu`), imports no site module and links to no route it was not
 * handed.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import AccountMenu from "./AccountMenu.vue";
import CommandPalette from "./CommandPalette.vue";
import Drawer from "./Drawer.vue";
import FrameSearchButton from "./FrameSearchButton.vue";
import FrameSidebar from "./FrameSidebar.vue";
import Icon from "./Icon.vue";
import Logo from "./Logo.vue";
import LogoMark from "./LogoMark.vue";
import NetworkMenu from "./NetworkMenu.vue";
import SiteFooter from "./SiteFooter.vue";
import ThemeLangControls from "./ThemeLangControls.vue";
import { useOverlay } from "../composables/useOverlay";
import { useMediaQuery } from "../composables/usePreferences";
import {
  frameLinks,
  railTabs,
  type FrameLayout,
  type FrameUser,
} from "../frame";
import { CHROME_MESSAGES, createTranslator } from "../i18n";
import {
  isCurrentPath,
  type NavChild,
  type NavItem,
  type NavSecondary,
  type Workspace,
} from "../nav";
import { framePaletteItems, type CommandItem } from "../palette";
import { currentRail, setRail } from "../rail";
import type { AfterSignOut } from "../signOut";
import { siteLabel, type SiteKey, type SiteOrigins } from "../sites";

const props = withDefaults(
  defineProps<{
    layout: FrameLayout;
    /** The site rendering this. */
    current: SiteKey;
    /** Active locale code, e.g. `zh-cn`. */
    locale: string;
    /** Current path — `Astro.url.pathname`. */
    pathname: string;
    /** The site's own nav. Bar on content/map, sidebar on tool, rail on rail. */
    nav: NavItem[];
    /** Pinned links at the foot of the tool sidebar. */
    secondary?: NavSecondary;
    /** Section switcher in the tool sidebar. */
    workspaces?: Workspace[];
    activeWorkspace?: string;
    /** Signed-in member; null when signed out. */
    user?: FrameUser | null;
    /** Links in the account menu, above sign out. */
    profileItems?: NavChild[];
    /** Signed-out button target. Absent renders no button. */
    signInHref?: string;
    /** `reload` on public sites, `web` (can-web `/`) on gated ones. */
    afterSignOut?: AfterSignOut;
    /** Where the brand links to. */
    homeHref?: string;
    /** Offer the language menu. */
    languages?: boolean;
    /** Chrome strings — see `CHROME_MESSAGES`. */
    messages?: Record<string, unknown>;
    /** `originsFromEnv(import.meta.env)`. */
    origins?: SiteOrigins;
  }>(),
  {
    secondary: undefined,
    workspaces: () => [],
    activeWorkspace: undefined,
    user: null,
    profileItems: () => [],
    signInHref: undefined,
    afterSignOut: "reload",
    homeHref: "/",
    languages: true,
    messages: () => ({}),
    origins: undefined,
  },
);

const t = createTranslator(props.messages, CHROME_MESSAGES);

const signedIn = computed(() => props.user != null);
const rating = computed(() => props.user?.rating);
const siteName = computed(() => siteLabel(props.locale, props.current).name);

/** Bar and drawer links. Absolute links stay. */
const links = computed(() => frameLinks(props.nav, { external: true }));
/** Rail layout on phones: up to three tabs; the rest opens at the top of "Me". */
const railSplit = computed(() => railTabs(props.nav));
const tabs = computed(() => railSplit.value.tabs);

/* ⌘K ----------------------------------------------------------------------- */
const paletteOpen = ref(false);
const paletteItems = computed<CommandItem[]>(() =>
  framePaletteItems({
    current: props.current,
    locale: props.locale,
    signedIn: signedIn.value,
    rating: rating.value,
    origins: props.origins,
    navigation: props.nav,
    workspaces: props.workspaces,
    secondary: props.secondary,
    workspaceLabel: t("workspace.label"),
  }),
);
function onSelect(item: CommandItem) {
  window.location.href = item.href;
}

/* Drawer: the site's nav on content/map, the sidebar on tool. -------------- */
const drawerOpen = ref(false);
const hasDrawer = computed(
  () =>
    props.layout === "tool" ||
    (props.layout !== "rail" && links.value.length > 0),
);
// Hiding the drawer at lg does not close it; close it on the breakpoint.
const isDesktop = useMediaQuery("(min-width: 1024px)");
watch(isDesktop, (desktop) => {
  if (desktop) drawerOpen.value = false;
});
// Drives NetworkMenu's DOM, so false in SSR and the first client render;
// the query applies from onMounted on.
const mounted = ref(false);
const phoneQuery = useMediaQuery("(max-width: 639.98px)");
const isPhone = computed(() => mounted.value && phoneQuery.value);

/* Scroll edge, content layout only. ---------------------------------------- */
const scrolled = ref(false);
function onScroll() {
  scrolled.value = window.scrollY > 8;
}

/* Rail: `collapsed` mirrors <html data-rail>; only setRail writes it. ------- */
const collapsed = ref(false);
let railObserver: MutationObserver | null = null;
function syncRail() {
  collapsed.value = currentRail() === "collapsed";
}
function toggleRail() {
  setRail(collapsed.value ? "expanded" : "collapsed");
}

/* Rail on phones: the "Me" sheet carries parts 1, 3, 4 and 5. useOverlay
   gives Escape, the focus trap, the scroll lock and focus returned to the tab.
   Closed at 768px, where the rail itself shows those parts. */
const meOpen = ref(false);
const meSheet = useOverlay(meOpen);
const isRailWidth = useMediaQuery("(min-width: 768px)");
watch(isRailWidth, (wide) => {
  if (wide) meOpen.value = false;
});

function onGlobalKeydown(event: KeyboardEvent) {
  // Another frame or AppShell handled it first: one palette, not two.
  if (event.defaultPrevented) return;
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    paletteOpen.value = !paletteOpen.value;
  }
}

onMounted(() => {
  mounted.value = true;
  document.addEventListener("keydown", onGlobalKeydown);
  if (props.layout === "content") {
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  if (props.layout === "rail") {
    syncRail();
    railObserver = new MutationObserver(syncRail);
    railObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-rail"],
    });
    // `auto` resolves differently across the tablet breakpoint.
    window.addEventListener("resize", syncRail);
  }
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onGlobalKeydown);
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", syncRail);
  railObserver?.disconnect();
});

/* Classes ------------------------------------------------------------------ */
const ROOT_CLASS: Record<FrameLayout, string> = {
  content: "flex min-h-dvh flex-col bg-surface",
  tool: "min-h-dvh bg-surface",
  map: "flex h-dvh flex-col overflow-hidden bg-surface",
  rail: "",
};

const BAR_CLASS: Record<FrameLayout, string> = {
  content:
    "mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8",
  tool: "flex h-16 items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:px-8",
  map: "flex h-14 items-center gap-2 px-2 sm:px-4",
  rail: "",
};

const headerClass = computed(() => {
  if (props.layout === "map") {
    return "relative z-40 flex-none border-b border-subtle bg-surface";
  }
  if (props.layout === "tool") {
    return "material-thin material-edge-bottom sticky top-0 z-40";
  }
  return [
    "sticky top-0 z-40 bg-chrome transition-shadow duration-200",
    scrolled.value
      ? "border-b border-subtle shadow-card"
      : "border-b border-transparent",
  ];
});

function barLinkClass(href: string) {
  const active = isCurrentPath(href, props.pathname);
  if (props.layout === "map") {
    return [
      "focus-ring relative flex items-center px-4 text-sm font-medium transition-colors",
      active
        ? "text-ink after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-can"
        : "text-muted hover:text-ink",
    ];
  }
  return [
    "focus-ring rounded-control px-3 py-2 text-sm font-semibold transition-colors",
    active
      ? "bg-surface-sunken text-can"
      : "text-muted hover:bg-surface-sunken hover:text-ink",
  ];
}

function drawerLinkClass(href: string) {
  return [
    "focus-ring flex items-center gap-3 rounded-control px-3 py-2.5 text-base font-semibold transition-colors",
    isCurrentPath(href, props.pathname)
      ? "bg-surface-sunken text-can"
      : "text-ink hover:bg-surface-sunken",
  ];
}

function railLinkClass(href: string) {
  return [
    "focus-ring rail-item flex items-center gap-2.5 rounded-control px-2.5 py-2 text-sm font-medium transition-colors",
    isCurrentPath(href, props.pathname)
      ? "bg-surface-raised text-can"
      : "text-muted hover:bg-surface-raised hover:text-ink",
  ];
}
</script>

<template>
  <div :class="ROOT_CLASS[layout]">
    <a
      href="#main-content"
      class="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]"
    >
      {{ t("skipToContent") }}
    </a>

    <!-- ============================== rail ============================== -->
    <template v-if="layout === 'rail'">
      <div class="app-rail bg-surface-sunken">
        <div
          class="flex grow flex-col gap-y-3 overflow-y-auto overscroll-contain px-3 py-4"
        >
          <!-- 1. Brand and NetworkMenu -->
          <a
            :href="homeHref"
            class="focus-ring rail-item flex items-center gap-2.5 rounded-control px-1.5 py-1 transition-colors hover:bg-surface-raised"
            :title="collapsed ? siteName : undefined"
          >
            <slot name="brand"><LogoMark class="size-8 shrink-0" /></slot>
            <span
              class="rail-label min-w-0 truncate text-sm font-semibold text-ink"
            >
              {{ siteName }}
            </span>
          </a>
          <div class="rail-item flex">
            <NetworkMenu
              :locale="locale"
              :current="current"
              :rating="rating"
              :signed-in="signedIn"
              :origins="origins"
              :compact="collapsed"
              placement="bottom-start"
            />
          </div>

          <!-- 2. ⌘K -->
          <FrameSearchButton
            variant="rail"
            :collapsed="collapsed"
            :label="t('search.label')"
            :placeholder="t('search.placeholder')"
            @open="paletteOpen = true"
          />

          <!-- 3. Notifications -->
          <div v-if="$slots.notifications" class="rail-item flex">
            <slot name="notifications" />
          </div>

          <slot name="sidebar" :collapsed="collapsed">
            <nav
              :aria-label="t('siteNavigation')"
              class="flex flex-col gap-y-0.5"
            >
              <template v-for="item in nav" :key="item.name">
                <p
                  v-if="item.children"
                  class="rail-label px-2.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-widest text-faint"
                >
                  {{ item.name }}
                </p>
                <a
                  v-for="link in frameLinks([item], { external: true })"
                  :key="link.href"
                  :href="link.href"
                  :aria-current="
                    isCurrentPath(link.href, pathname) ? 'page' : undefined
                  "
                  :title="collapsed ? link.name : undefined"
                  :class="railLinkClass(link.href)"
                >
                  <Icon :name="link.icon" class="size-5 shrink-0" />
                  <span class="rail-label truncate">{{ link.name }}</span>
                </a>
              </template>
            </nav>
          </slot>

          <div
            class="mt-auto flex flex-col gap-y-2 border-t border-subtle pt-3"
          >
            <!-- 4. Theme and language, plus the collapse toggle -->
            <div
              :class="[
                'flex items-center gap-0.5',
                collapsed ? 'flex-col' : '',
              ]"
            >
              <ThemeLangControls
                :locale="locale"
                :languages="languages"
                :messages="messages"
              />
              <button
                type="button"
                :class="[
                  'focus-ring flex size-9 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-raised hover:text-ink',
                  collapsed ? '' : 'ml-auto',
                ]"
                :aria-label="collapsed ? t('rail.expand') : t('rail.collapse')"
                :title="collapsed ? t('rail.expand') : t('rail.collapse')"
                @click="toggleRail"
              >
                <Icon
                  :name="collapsed ? 'chevronDoubleRight' : 'chevronDoubleLeft'"
                  class="size-5"
                />
              </button>
            </div>

            <!-- 5. Account -->
            <AccountMenu
              v-if="user"
              variant="rail"
              :collapsed="collapsed"
              :user="user"
              :profile-items="profileItems"
              :after-sign-out="afterSignOut"
              :messages="messages"
              :origins="origins"
            >
              <template v-if="$slots.profileMenu" #profileMenu>
                <slot name="profileMenu" />
              </template>
            </AccountMenu>
            <a
              v-else-if="signInHref"
              :href="signInHref"
              class="focus-ring rail-item flex items-center gap-2.5 rounded-control px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-ink"
              :title="collapsed ? t('signIn') : undefined"
            >
              <Icon name="arrowLeftOnRectangle" class="size-5 shrink-0" />
              <span class="rail-label truncate">{{ t("signIn") }}</span>
            </a>
          </div>
        </div>
      </div>

      <!-- Phones: up to three of this site's pages (`railTabs`), then ⌘K, then
           "Me" — the sheet
           with the other four parts. Page links work before hydration. -->
      <nav class="tab-bar bg-surface" :aria-label="t('siteNavigation')">
        <a
          v-for="link in tabs"
          :key="link.href"
          :href="link.href"
          class="tab-bar-item"
          :aria-current="
            isCurrentPath(link.href, pathname) ? 'page' : undefined
          "
        >
          <Icon :name="link.icon" class="size-6" />
          <span class="max-w-full truncate px-1">{{ link.name }}</span>
        </a>
        <button type="button" class="tab-bar-item" @click="paletteOpen = true">
          <Icon name="magnifyingGlass" class="size-6" />
          <span class="max-w-full truncate px-1">{{ t("search.label") }}</span>
        </button>
        <button
          type="button"
          class="tab-bar-item"
          aria-haspopup="dialog"
          :aria-expanded="meOpen"
          @click="meOpen = true"
        >
          <Icon name="userCircle" class="size-6" />
          <span class="max-w-full truncate px-1">{{ t("rail.me") }}</span>
        </button>
      </nav>

      <!-- The "Me" sheet. Not teleported: Teleport does not survive Astro's
           Vue SSR pass cleanly (see CommandPalette). The tab bar has no
           backdrop-filter ancestor here, so `fixed` resolves to the viewport.
           `v-if`, so NetworkMenu and AccountMenu popovers mount fresh. -->
      <div
        v-if="meOpen"
        class="fixed inset-0 z-50 md:hidden"
        role="dialog"
        aria-modal="true"
        :aria-label="t('rail.me')"
      >
        <div
          class="animate-overlay-in absolute inset-0 bg-[var(--scrim)]"
          aria-hidden="true"
          @click="meOpen = false"
        ></div>
        <div
          ref="meSheet"
          tabindex="-1"
          class="animate-panel-in absolute inset-x-0 bottom-0 flex max-h-[80dvh] flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-[var(--radius-sheet)] border-t border-subtle bg-surface-overlay px-4 pb-safe pt-3 shadow-sheet"
        >
          <div class="flex items-center justify-between">
            <span class="text-sm font-semibold text-ink">{{ siteName }}</span>
            <button
              type="button"
              class="focus-ring inline-flex size-10 items-center justify-center rounded-control text-muted hover:bg-surface-sunken hover:text-ink"
              :aria-label="t('close')"
              @click="meOpen = false"
            >
              <Icon name="xMark" class="size-6" />
            </button>
          </div>

          <!-- The site's nav leaves that are not tabs, flattened. -->
          <nav
            v-if="railSplit.overflow.length"
            :aria-label="t('siteNavigation')"
            class="flex flex-col gap-0.5"
          >
            <a
              v-for="link in railSplit.overflow"
              :key="link.href"
              :href="link.href"
              :aria-current="
                isCurrentPath(link.href, pathname) ? 'page' : undefined
              "
              :class="drawerLinkClass(link.href)"
            >
              <Icon :name="link.icon" class="size-5 shrink-0" />
              {{ link.name }}
            </a>
          </nav>

          <!-- 1. NetworkMenu -->
          <NetworkMenu
            :locale="locale"
            :current="current"
            :rating="rating"
            :signed-in="signedIn"
            :origins="origins"
            placement="top-start"
          />

          <!-- 3. Notifications -->
          <div v-if="$slots.notifications" class="flex">
            <slot name="notifications" />
          </div>

          <!-- 4. Theme and language -->
          <ThemeLangControls
            :locale="locale"
            :languages="languages"
            :messages="messages"
          />

          <!-- 5. Account -->
          <AccountMenu
            v-if="user"
            variant="rail"
            :user="user"
            :profile-items="profileItems"
            :after-sign-out="afterSignOut"
            :messages="messages"
            :origins="origins"
          >
            <template v-if="$slots.profileMenu" #profileMenu>
              <slot name="profileMenu" />
            </template>
          </AccountMenu>
          <a
            v-else-if="signInHref"
            :href="signInHref"
            class="btn btn-primary w-full px-4 py-2.5"
          >
            {{ t("signIn") }}
            <Icon name="arrowRight" class="size-4" />
          </a>
        </div>
      </div>

      <main id="main-content" tabindex="-1" class="focus:outline-none">
        <slot />
      </main>
    </template>

    <!-- ======================== content, tool, map ======================= -->
    <template v-else>
      <header :class="headerClass">
        <div :class="BAR_CLASS[layout]">
          <button
            v-if="hasDrawer"
            type="button"
            class="focus-ring -ml-1 inline-flex size-10 shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-sunken hover:text-ink lg:hidden"
            :aria-label="layout === 'tool' ? t('openSidebar') : t('openMenu')"
            :aria-expanded="drawerOpen"
            @click="drawerOpen = true"
          >
            <Icon name="bars3" class="size-6" />
          </button>

          <!-- 1. Brand and NetworkMenu -->
          <a
            :href="homeHref"
            class="focus-ring -m-1.5 flex shrink-0 items-center p-1.5"
          >
            <slot name="brand">
              <LogoMark class="size-8 sm:hidden" />
              <Logo
                alt="Cerulean Aviation Network"
                :class="[
                  'hidden w-auto sm:block',
                  layout === 'map' ? 'h-8' : 'h-9',
                ]"
              />
            </slot>
          </a>
          <NetworkMenu
            :locale="locale"
            :current="current"
            :rating="rating"
            :signed-in="signedIn"
            :origins="origins"
            :compact="isPhone"
          />

          <nav
            v-if="layout !== 'tool' && links.length"
            :aria-label="t('siteNavigation')"
            :class="[
              'hidden lg:ml-2 lg:flex lg:gap-1',
              layout === 'map' ? 'lg:self-stretch' : 'lg:items-center',
            ]"
          >
            <a
              v-for="link in links"
              :key="link.href"
              :href="link.href"
              :aria-current="
                isCurrentPath(link.href, pathname) ? 'page' : undefined
              "
              :class="barLinkClass(link.href)"
            >
              {{ link.name }}
            </a>
          </nav>

          <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <slot name="actions" />

            <!-- 2. ⌘K -->
            <FrameSearchButton
              :label="t('search.label')"
              :placeholder="t('search.placeholder')"
              @open="paletteOpen = true"
            />

            <!-- 3. Notifications -->
            <slot name="notifications" />

            <!-- 4. Theme and language -->
            <ThemeLangControls
              :locale="locale"
              :languages="languages"
              :messages="messages"
            />

            <!-- 5. Account -->
            <AccountMenu
              v-if="user"
              :user="user"
              :profile-items="profileItems"
              :after-sign-out="afterSignOut"
              :messages="messages"
              :origins="origins"
            >
              <template v-if="$slots.profileMenu" #profileMenu>
                <slot name="profileMenu" />
              </template>
            </AccountMenu>
            <a
              v-else-if="signInHref"
              :href="signInHref"
              class="btn btn-primary px-3 py-2 sm:px-4"
              :aria-label="t('signIn')"
            >
              <span class="hidden sm:inline">{{ t("signIn") }}</span>
              <Icon name="arrowRight" class="size-4" />
            </a>
          </div>
        </div>
      </header>

      <Drawer
        v-if="hasDrawer"
        v-model:open="drawerOpen"
        side="left"
        width="17rem"
        :label="layout === 'tool' ? t('openSidebar') : t('openMenu')"
        :messages="messages"
      >
        <template #header>
          <a :href="homeHref" class="focus-ring -m-1.5 block p-1.5">
            <slot name="brand"><Logo class="h-9 w-auto" /></slot>
          </a>
        </template>

        <FrameSidebar
          v-if="layout === 'tool'"
          :navigation="nav"
          :pathname="pathname"
          :secondary="secondary"
          :workspaces="workspaces"
          :active-workspace="activeWorkspace"
          :workspace-label="t('workspace.label')"
          tone="sunken"
          :messages="messages"
        />
        <nav
          v-else
          :aria-label="t('siteNavigation')"
          class="flex flex-col gap-1"
        >
          <a
            v-for="link in links"
            :key="link.href"
            :href="link.href"
            :aria-current="
              isCurrentPath(link.href, pathname) ? 'page' : undefined
            "
            :class="drawerLinkClass(link.href)"
          >
            <Icon :name="link.icon" class="size-5 shrink-0" />
            {{ link.name }}
          </a>
        </nav>
      </Drawer>

      <template v-if="layout === 'tool'">
        <aside
          class="hidden lg:fixed lg:bottom-0 lg:top-16 lg:z-30 lg:flex lg:w-72 lg:flex-col"
          :aria-label="t('sidebar')"
        >
          <div
            class="flex grow flex-col overflow-y-auto border-r border-subtle bg-surface-sunken px-5 py-4"
          >
            <FrameSidebar
              :navigation="nav"
              :pathname="pathname"
              :secondary="secondary"
              :workspaces="workspaces"
              :active-workspace="activeWorkspace"
              :workspace-label="t('workspace.label')"
              tone="surface"
              :messages="messages"
            />
          </div>
        </aside>

        <div class="flex min-h-[calc(100dvh-4rem)] flex-col lg:pl-72">
          <main
            id="main-content"
            tabindex="-1"
            class="flex-1 py-8 focus:outline-none lg:py-10"
          >
            <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <slot />
            </div>
          </main>
          <SiteFooter compact :locale="locale" :origins="origins">
            <template v-if="$slots.footer" #services>
              <slot name="footer" />
            </template>
          </SiteFooter>
        </div>
      </template>

      <main
        v-else-if="layout === 'map'"
        id="main-content"
        tabindex="-1"
        class="relative min-h-0 flex-1 focus:outline-none"
      >
        <slot />
      </main>

      <template v-else>
        <main id="main-content" tabindex="-1" class="flex-1 focus:outline-none">
          <slot />
        </main>
        <SiteFooter
          :locale="locale"
          :current="current"
          :rating="rating"
          :signed-in="signedIn"
          :origins="origins"
        >
          <template v-if="$slots.footer" #services>
            <slot name="footer" />
          </template>
        </SiteFooter>
      </template>
    </template>

    <CommandPalette
      v-model:open="paletteOpen"
      :items="paletteItems"
      :messages="messages"
      @select="onSelect"
    />
  </div>
</template>
