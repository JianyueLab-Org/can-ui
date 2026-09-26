<script setup lang="ts">
/**
 * The page-site header — can-web, can-dev, can-exam and can-radar.
 *
 * ## What it replaces
 *
 * Four hand-kept copies. can-web's and can-dev's were the same file with
 * different nav arrays; can-radar's had been re-skinned to sit on a map; the
 * exam centre's had no mobile drawer, no skip link and a `/logo.png` only its
 * own host serves. The drawer rule further down was written out as a comment
 * in three of them, because each had shipped without it once.
 *
 * ## What it does not do
 *
 * The four things `AppShell` gave up, for the same reasons. It calls no API —
 * sign-out is `@signout`. It imports no site dictionary — `labels` in. It
 * links to no route it was not handed — `nav`, `homeHref`, `signInHref`. And
 * it decides nothing about who may see what: `rating` only reaches the network
 * list, where it keeps a certain 403 out of a menu.
 *
 * ## Variants
 *
 * `default` is sticky and grows a border and shadow after 8px of scroll.
 * `compact` is the radar's: 56px, a hairline border, not sticky — that page's
 * body never scrolls, so a scroll listener there never fires — and the active
 * item is underlined rather than filled, so the bar reads as the map's top edge
 * rather than as a panel laid over it.
 */
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useId,
  useSlots,
  watch,
} from "vue";
import Icon from "./Icon.vue";
import Logo from "./Logo.vue";
import NetworkMenu from "./NetworkMenu.vue";
import ThemeLangControls from "./ThemeLangControls.vue";
import { useOverlay } from "../composables/useOverlay";
import { useMediaQuery } from "../composables/usePreferences";
import { CHROME_MESSAGES, createTranslator } from "../i18n";
import { isCurrentPath, type NavChild } from "../nav";
import { sectionHeadings, type SiteKey, type SiteOrigins } from "../sites";
import { headerNetworkSites, type SiteHeaderLabels } from "../siteHeader";

const props = withDefaults(
  defineProps<{
    /** The site rendering this — `web`, `dev`, `exam` or `radar`. */
    current: SiteKey;
    /** Active locale code, e.g. `zh-cn`. */
    locale: string;
    /** Current path — `Astro.url.pathname`. */
    pathname: string;
    /** The site's own pages. Other sites belong to the network menu. */
    nav: NavChild[];
    signedIn: boolean;
    /** Session rating. Menu only, never access control — see `sites.ts`. */
    rating?: number;
    /** Where the brand links to. */
    homeHref?: string;
    variant?: "default" | "compact";
    /**
     * Target of the default signed-out button. Absent renders no button:
     * where sign-in lives is the site's business, and a default here would be
     * a hardcoded route.
     */
    signInHref?: string;
    labels: SiteHeaderLabels;
    /** Dev/staging origin overrides — see `siteUrl` in `sites.ts`. */
    origins?: SiteOrigins;
  }>(),
  {
    rating: undefined,
    homeHref: "/",
    variant: "default",
    signInHref: undefined,
  },
);

const emit = defineEmits<{
  /** The member pressed sign out. The site owns the call and the redirect. */
  signout: [];
}>();

const slots = useSlots();
const chrome = createTranslator(CHROME_MESSAGES);

const compact = computed(() => props.variant === "compact");
const signInLabel = computed(() => props.labels.signIn ?? chrome("signIn"));
const signOutLabel = computed(() => props.labels.signOut ?? chrome("signOut"));

/* ---------------------------------------------------------------------------
   Drawer. `useOverlay` gives Escape, the focus trap, the scroll lock and focus
   returned to the menu button; `useId` gives `aria-controls` an id that
   matches between the server render and hydration.
--------------------------------------------------------------------------- */
const menuOpen = ref(false);
const drawerId = useId();
const panel = useOverlay(menuOpen);

/**
 * The drawer is `lg:hidden`, but hiding it does not close it: widen a window
 * past the breakpoint with the drawer open and the scroll lock stays on a page
 * that shows no drawer. Closed on the breakpoint instead — the same fix
 * `AppShell` carries for its rail.
 */
const isDesktop = useMediaQuery("(min-width: 1024px)");
watch(isDesktop, (desktop) => {
  if (desktop) menuOpen.value = false;
});

const networkLabel = computed(() => sectionHeadings(props.locale).menuLabel);
const networkSites = computed(() =>
  headerNetworkSites({
    current: props.current,
    locale: props.locale,
    rating: props.rating,
    signedIn: props.signedIn,
    origins: props.origins,
  }),
);

/** The drawer's account block, only when there is something to put in it. */
const showDrawerAccount = computed(
  () => !!slots["drawer-extra"] || props.signedIn || !!props.signInHref,
);

/* ---------------------------------------------------------------------------
   Scroll edge. Default variant only.
--------------------------------------------------------------------------- */
const scrolled = ref(false);
function onScroll() {
  scrolled.value = window.scrollY > 8;
}
onMounted(() => {
  if (compact.value) return;
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
});
onBeforeUnmount(() => window.removeEventListener("scroll", onScroll));

const headerClass = computed(() =>
  compact.value
    ? "relative z-40 flex-none border-b border-subtle bg-surface"
    : [
        "sticky top-0 z-40 bg-chrome transition-shadow duration-200",
        scrolled.value
          ? "border-b border-subtle shadow-card"
          : "border-b border-transparent",
      ],
);

function desktopItemClass(href: string) {
  const active = isCurrentPath(href, props.pathname);
  if (compact.value) {
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

function drawerItemClass(href: string) {
  return [
    "focus-ring flex items-center gap-3 rounded-control px-3 py-2.5 text-base font-semibold transition-colors",
    isCurrentPath(href, props.pathname)
      ? "bg-surface-sunken text-can"
      : "text-ink hover:bg-surface-sunken",
  ];
}
</script>

<template>
  <header :class="headerClass">
    <a
      href="#main-content"
      class="btn btn-primary sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
    >
      {{ labels.skip }}
    </a>

    <nav
      aria-label="Global"
      :class="
        compact
          ? 'flex h-14 items-center gap-2 px-2 sm:px-4'
          : 'mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8'
      "
    >
      <a
        :href="homeHref"
        class="focus-ring -m-1.5 flex shrink-0 items-center p-1.5"
      >
        <slot name="brand">
          <Logo
            alt="Cerulean Aviation Network"
            :class="compact ? 'h-8 w-auto' : 'h-10 w-auto'"
          />
        </slot>
      </a>

      <div
        :class="[
          'hidden lg:ml-4 lg:flex lg:gap-1',
          compact ? 'lg:self-stretch' : 'lg:items-center',
        ]"
      >
        <a
          v-for="item in nav"
          :key="item.href"
          :href="item.href"
          :aria-current="
            isCurrentPath(item.href, pathname) ? 'page' : undefined
          "
          :class="desktopItemClass(item.href)"
        >
          {{ item.name }}
        </a>
      </div>

      <div class="ml-auto flex items-center gap-2">
        <slot name="actions" />

        <div class="hidden sm:block">
          <NetworkMenu
            :locale="locale"
            :current="current"
            :rating="rating"
            :signed-in="signedIn"
            :origins="origins"
          />
        </div>
        <div class="hidden sm:block">
          <ThemeLangControls :locale="locale" />
        </div>

        <div class="hidden items-center gap-2 sm:flex">
          <slot name="account">
            <button
              v-if="signedIn"
              type="button"
              class="btn btn-ghost px-4 py-2"
              @click="emit('signout')"
            >
              {{ signOutLabel }}
            </button>
            <a
              v-else-if="signInHref"
              :href="signInHref"
              class="btn btn-primary px-4 py-2"
            >
              {{ signInLabel }}
              <Icon name="arrowRight" class="size-4" />
            </a>
          </slot>
        </div>

        <button
          type="button"
          class="focus-ring -mr-2 inline-flex size-10 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-sunken hover:text-ink lg:hidden"
          :aria-expanded="menuOpen"
          :aria-controls="drawerId"
          @click="menuOpen = true"
        >
          <span class="sr-only">{{ labels.menu }}</span>
          <Icon name="bars3" class="size-6" />
        </button>
      </div>
    </nav>
  </header>

  <!-- Mobile drawer. A **sibling** of <header>, never a child, and not
       teleported.

       <header> carries `bg-chrome`, which sets a backdrop-filter — and an
       element with a backdrop-filter becomes the containing block for its
       `position: fixed` descendants. Nested inside, `fixed inset-0` resolved
       against the 64px header rather than the viewport, so on a phone the
       backdrop was a thin strip under the bar and the panel had nowhere to go.
       Safari is strictest about it; every engine does it.

       Not teleported because Teleport does not survive Astro's Vue SSR pass
       cleanly. `v-show` rather than `v-if` so `aria-controls` always names an
       element that exists. -->
  <div
    v-show="menuOpen"
    :id="drawerId"
    class="lg:hidden"
    role="dialog"
    aria-modal="true"
    :aria-label="labels.menu"
  >
    <div
      class="animate-overlay-in fixed inset-0 z-50 bg-gray-900/40 backdrop-blur-sm"
      @click="menuOpen = false"
    ></div>
    <div
      ref="panel"
      tabindex="-1"
      class="animate-drawer-in-right fixed inset-y-0 right-0 z-50 flex w-full max-w-xs flex-col overflow-y-auto overscroll-contain border-l border-subtle bg-surface px-6 py-5 shadow-popover"
    >
      <div class="flex items-center justify-between">
        <a :href="homeHref" class="focus-ring -m-1.5 flex items-center p-1.5">
          <slot name="brand">
            <Logo alt="Cerulean Aviation Network" class="h-10 w-auto" />
          </slot>
        </a>
        <button
          type="button"
          class="focus-ring -mr-2 inline-flex size-10 items-center justify-center rounded-control text-muted hover:bg-surface-sunken hover:text-ink"
          @click="menuOpen = false"
        >
          <span class="sr-only">{{ labels.close }}</span>
          <Icon name="xMark" class="size-6" />
        </button>
      </div>

      <div class="mt-6 flex flex-col gap-1">
        <a
          v-for="item in nav"
          :key="item.href"
          :href="item.href"
          :aria-current="
            isCurrentPath(item.href, pathname) ? 'page' : undefined
          "
          :class="drawerItemClass(item.href)"
        >
          <Icon v-if="item.icon" :name="item.icon" class="size-5 shrink-0" />
          {{ item.name }}
        </a>

        <!-- The network menu, laid out flat: a popover opened from inside the
             drawer would open underneath it. -->
        <template v-if="networkSites.length">
          <div
            class="mt-4 px-3 pb-1 text-[11px] font-semibold uppercase tracking-widest text-faint"
          >
            {{ networkLabel }}
          </div>
          <a
            v-for="site in networkSites"
            :key="site.key"
            :href="site.href"
            class="focus-ring flex items-start gap-3 rounded-control px-3 py-2.5 transition-colors hover:bg-surface-sunken"
          >
            <Icon :name="site.icon" class="mt-0.5 size-5 shrink-0 text-can" />
            <span class="min-w-0">
              <span class="block truncate text-base font-semibold text-ink">
                {{ site.name }}
              </span>
              <span class="block truncate text-xs text-faint">
                {{ site.tagline }}
              </span>
            </span>
          </a>
        </template>
      </div>

      <div
        v-if="showDrawerAccount"
        class="mt-6 flex flex-col gap-2 border-t border-subtle pt-6"
      >
        <slot name="drawer-extra">
          <button
            v-if="signedIn"
            type="button"
            class="btn btn-ghost w-full px-4 py-2.5"
            @click="emit('signout')"
          >
            {{ signOutLabel }}
          </button>
          <a
            v-else-if="signInHref"
            :href="signInHref"
            class="btn btn-primary w-full px-4 py-2.5"
          >
            {{ signInLabel }}
            <Icon name="arrowRight" class="size-4" />
          </a>
        </slot>
      </div>

      <div class="mt-auto pt-6">
        <ThemeLangControls :locale="locale" />
      </div>
    </div>
  </div>
</template>
