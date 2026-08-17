<script setup lang="ts">
/**
 * The authenticated frame: a sidebar of navigation, a top bar carrying quick
 * nav and the account menu, and the page in the middle.
 *
 * This is the component that was hardest to lift out of can-web, and it is
 * worth naming exactly what was in the way, because the same four things will
 * be in the way of the next shell somebody tries to share:
 *
 * 1. **It called can-api.** Sign-out was `api("/api/v1/auth/signout")` right
 *    here. A design system that knows the network's auth endpoint is not a
 *    design system. Sign-out is now an `@signout` event and the site makes the
 *    call — which it has to anyway, because clearing the cookie is can-api's
 *    job and only the site knows where to send the member afterwards.
 * 2. **It imported the site's i18n module.** Now it takes `messages` and falls
 *    back to English (see src/i18n.ts).
 * 3. **The brand was `<img src="/logo-full.png">`** — a path only can-web
 *    serves. Now a slot, defaulting to `<Logo>`, which resolves its own asset.
 * 4. **The account menu linked to `/pilots/status`**, a route that exists on
 *    exactly one of the six sites. Now `profileItems`, or the `profileMenu`
 *    slot for anything more than links.
 *
 * What did *not* change is the layout, the breakpoints or the class list.
 * Every one of those was argued about once already and the arguments are in
 * can-web's history; re-deciding them while moving files is how a migration
 * turns into a redesign nobody asked for.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import Icon from "./Icon.vue";
import Logo from "./Logo.vue";
import Avatar from "./Avatar.vue";
import Drawer from "./Drawer.vue";
import SidebarNav from "./SidebarNav.vue";
import ThemeLangControls from "./ThemeLangControls.vue";
import CommandPalette, { type CommandItem } from "./CommandPalette.vue";
import { createTranslator, CHROME_MESSAGES } from "../i18n";
import { useMediaQuery } from "../composables/usePreferences";
import type { NavChild, NavItem, NavSecondary, Workspace } from "../nav";

const props = withDefaults(
  defineProps<{
    navigation: NavItem[];
    /** Current path — `Astro.url.pathname`. */
    pathname: string;
    messages?: Record<string, unknown>;
    locale?: string;
    /** Pinned cross-links at the foot of the rail. */
    secondary?: NavSecondary;
    /** Section switcher above the nav; omitted renders none. */
    workspaces?: Workspace[];
    activeWorkspace?: string;
    userName?: string;
    /** Member ID, shown under the name in the account menu. */
    userId?: string;
    /** Links in the account menu, above sign out. */
    profileItems?: NavChild[];
    /** Where the brand links to. */
    homeHref?: string;
    /** Offer the language menu. Off for a single-language surface. */
    languages?: boolean;
  }>(),
  {
    messages: () => ({}),
    locale: "zh-cn",
    homeHref: "/",
    languages: true,
    profileItems: () => [],
  },
);

const emit = defineEmits<{
  /** The member pressed sign out. The site owns the call and the redirect. */
  signout: [];
}>();

const t = createTranslator(props.messages, CHROME_MESSAGES);

const sidebarOpen = ref(false);
const searchOpen = ref(false);
const profileOpen = ref(false);
const profileRoot = ref<HTMLElement | null>(null);
const profileButton = ref<HTMLElement | null>(null);

/* ---------------------------------------------------------------------------
   Quick nav. Flattened from the rail, so a route added to the shell is
   searchable with no second list to maintain.
--------------------------------------------------------------------------- */
const commands = computed<CommandItem[]>(() => {
  const items: CommandItem[] = [];
  const push = (item: CommandItem) => {
    if (item.href && item.href !== "#") items.push(item);
  };

  for (const workspace of props.workspaces ?? []) {
    push({
      name: workspace.name,
      href: workspace.href,
      icon: workspace.icon,
      section: t("workspace.label"),
    });
  }
  for (const item of props.navigation) {
    if (item.href) push({ name: item.name, href: item.href, icon: item.icon });
    for (const child of item.children ?? []) {
      push({
        name: child.name,
        href: child.href,
        icon: child.icon ?? item.icon,
        section: item.name,
      });
    }
  }
  for (const item of props.secondary?.items ?? []) {
    push({
      name: item.name,
      href: item.href,
      icon: item.icon ?? "arrowPath",
      section: props.secondary?.label,
    });
  }
  return items;
});

function onSelect(item: CommandItem) {
  window.location.href = item.href;
}

/**
 * The mobile rail is a Drawer, and a Drawer's root is a `<Teleport>` — not an
 * element, so a fallthrough `lg:hidden` on it lands nowhere and is silently
 * dropped. Rotating a phone to landscape, or dragging a desktop window wider,
 * would leave it open on top of the permanent rail with two copies of the same
 * nav on screen.
 *
 * Closed on the breakpoint instead, which is the honest fix: the drawer and
 * the fixed rail are two presentations of one thing, and only one of them
 * should ever be showing.
 */
const isDesktop = useMediaQuery("(min-width: 1024px)");
watch(isDesktop, (desktop) => {
  if (desktop) sidebarOpen.value = false;
});

function onGlobalKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchOpen.value = !searchOpen.value;
  } else if (event.key === "Escape" && profileOpen.value) {
    profileOpen.value = false;
    profileButton.value?.focus();
  }
}
function onGlobalClick(event: MouseEvent) {
  if (!profileRoot.value?.contains(event.target as Node)) {
    profileOpen.value = false;
  }
}

onMounted(() => {
  document.addEventListener("keydown", onGlobalKeydown);
  document.addEventListener("click", onGlobalClick);
});
onBeforeUnmount(() => {
  document.removeEventListener("keydown", onGlobalKeydown);
  document.removeEventListener("click", onGlobalClick);
});
</script>

<template>
  <div class="bg-surface">
    <!-- Keyboard users land here first and can jump the whole rail. -->
    <a
      href="#main-content"
      class="btn btn-primary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60]"
    >
      {{ t("skipToContent") }}
    </a>

    <!-- Mobile rail. A Drawer rather than a hand-rolled overlay, so it can be
         pushed back to the edge it came from instead of only tapped away. -->
    <Drawer
      v-model:open="sidebarOpen"
      side="left"
      width="17rem"
      :label="t('openSidebar')"
    >
      <template #header>
        <a :href="homeHref" class="-m-1.5 block p-1.5">
          <slot name="brand"><Logo class="h-9 w-auto" /></slot>
        </a>
      </template>

      <div class="flex h-full flex-col gap-y-4">
        <div
          v-if="workspaces?.length"
          role="group"
          :aria-label="t('workspace.label')"
          class="flex gap-1 rounded-control bg-surface-sunken p-1"
        >
          <a
            v-for="workspace in workspaces"
            :key="workspace.key"
            :href="workspace.href"
            :aria-current="
              workspace.key === activeWorkspace ? 'true' : undefined
            "
            :class="[
              'tap-row flex flex-1 items-center justify-center truncate rounded-[calc(var(--radius-control)-2px)] px-2 py-1.5 text-center text-xs font-semibold transition-colors',
              workspace.key === activeWorkspace
                ? 'bg-surface-raised text-can shadow-card'
                : 'text-muted hover:text-ink',
            ]"
          >
            {{ workspace.name }}
          </a>
        </div>

        <SidebarNav
          :navigation="navigation"
          :pathname="pathname"
          :secondary="secondary"
        />
      </div>
    </Drawer>

    <!-- Desktop rail -->
    <div
      class="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col"
    >
      <div
        class="flex grow flex-col gap-y-4 overflow-y-auto border-r border-subtle bg-surface-sunken px-5 pb-4"
      >
        <div class="flex h-16 shrink-0 items-center">
          <a :href="homeHref" class="-m-1.5 p-1.5">
            <slot name="brand"><Logo class="h-9 w-auto" /></slot>
          </a>
        </div>

        <!-- Section switcher. Crossing between sections used to mean expanding
             a collapsed accordion, or — for one of them — was not possible at
             all. Labels only: at three segments a CJK label leaves no room for
             an icon beside it. -->
        <div
          v-if="workspaces?.length"
          role="group"
          :aria-label="t('workspace.label')"
          class="flex gap-1 rounded-control bg-surface p-1"
        >
          <a
            v-for="workspace in workspaces"
            :key="workspace.key"
            :href="workspace.href"
            :aria-current="
              workspace.key === activeWorkspace ? 'true' : undefined
            "
            :class="[
              'tap-row flex flex-1 items-center justify-center truncate rounded-[calc(var(--radius-control)-2px)] px-2 py-1.5 text-center text-xs font-semibold transition-colors',
              workspace.key === activeWorkspace
                ? 'bg-surface-raised text-can shadow-card'
                : 'text-muted hover:text-ink',
            ]"
          >
            {{ workspace.name }}
          </a>
        </div>

        <SidebarNav
          :navigation="navigation"
          :pathname="pathname"
          :secondary="secondary"
        />
      </div>
    </div>

    <!-- Main column. A full-height flex column so a short page's footer settles
         at the bottom of the viewport rather than mid-screen. -->
    <div class="flex min-h-dvh flex-col lg:pl-72">
      <div class="material-thin material-edge-bottom sticky top-0 z-40">
        <div
          class="mx-auto flex h-16 max-w-7xl items-center gap-x-3 px-4 sm:gap-x-4 sm:px-6 lg:px-8"
        >
          <button
            type="button"
            class="icon-button -ml-2 lg:hidden"
            :aria-label="t('openSidebar')"
            :aria-expanded="sidebarOpen"
            @click="sidebarOpen = true"
          >
            <Icon name="bars3" class="size-6" />
          </button>

          <!-- Quick nav trigger. Icon-only on a phone: as a labelled pill it
               refused to shrink and squeezed the menu button to 27px. -->
          <button
            type="button"
            class="flex size-10 shrink-0 items-center justify-center rounded-control text-muted transition-colors hover:bg-surface-sunken hover:text-ink sm:h-9 sm:w-auto sm:min-w-0 sm:max-w-xs sm:flex-1 sm:shrink sm:justify-start sm:gap-2 sm:border sm:border-subtle sm:bg-surface-sunken sm:px-3 sm:text-sm sm:text-faint sm:hover:border-strong sm:hover:text-muted"
            :aria-label="t('search.label')"
            @click="searchOpen = true"
          >
            <Icon name="magnifyingGlass" class="size-5 shrink-0 sm:size-4" />
            <span class="hidden truncate sm:inline">
              {{ t("search.placeholder") }}
            </span>
            <kbd
              class="ml-auto hidden shrink-0 rounded border border-subtle bg-surface-raised px-1.5 py-0.5 font-mono text-[0.625rem] text-faint sm:block"
            >
              ⌘K
            </kbd>
          </button>

          <div class="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeLangControls
              :locale="locale"
              :languages="languages"
              :messages="messages"
            />

            <div ref="profileRoot" class="relative">
              <button
                ref="profileButton"
                type="button"
                class="flex items-center gap-2 rounded-control p-1.5 transition-colors hover:bg-surface-sunken"
                :aria-expanded="profileOpen"
                aria-haspopup="menu"
                @click="profileOpen = !profileOpen"
              >
                <span class="sr-only">{{ t("openUserMenu") }}</span>
                <Avatar :name="userName" />
                <span
                  class="hidden max-w-32 truncate text-sm font-semibold text-ink lg:block"
                >
                  {{ userName }}
                </span>
                <Icon
                  name="chevronDown"
                  :class="[
                    'size-4 text-faint transition-transform duration-200',
                    profileOpen ? 'rotate-180' : '',
                  ]"
                />
              </button>

              <div
                v-if="profileOpen"
                role="menu"
                class="animate-panel-in absolute right-0 z-10 mt-2 w-56 overflow-hidden rounded-card border border-subtle bg-surface-overlay py-1 shadow-popover"
                style="--origin-x: 100%; --origin-y: 0%"
              >
                <div class="border-b border-subtle px-4 py-3">
                  <p class="truncate text-sm font-semibold text-ink">
                    {{ userName }}
                  </p>
                  <p v-if="userId" class="mt-0.5 font-mono text-xs text-faint">
                    #{{ userId }}
                  </p>
                </div>

                <slot name="profileMenu">
                  <a
                    v-for="item in profileItems"
                    :key="item.href"
                    :href="item.href"
                    role="menuitem"
                    class="tap-row flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted transition-colors hover:bg-surface-sunken hover:text-ink"
                  >
                    <Icon v-if="item.icon" :name="item.icon" class="size-4" />
                    {{ item.name }}
                  </a>
                </slot>

                <button
                  type="button"
                  role="menuitem"
                  class="tap-row flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-muted transition-colors hover:bg-surface-sunken hover:text-danger"
                  @click="emit('signout')"
                >
                  <Icon name="arrowRightOnRectangle" class="size-4" />
                  {{ t("signOut") }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main id="main-content" tabindex="-1" class="flex-1 py-8 lg:py-10">
        <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <slot />
        </div>
      </main>

      <footer v-if="$slots.footer" class="border-t border-subtle">
        <div class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <slot name="footer" />
        </div>
      </footer>
    </div>

    <CommandPalette
      v-model:open="searchOpen"
      :items="commands"
      :messages="messages"
      @select="onSelect"
    />
  </div>
</template>
