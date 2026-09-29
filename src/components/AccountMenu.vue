<script setup lang="ts">
/**
 * The account control: avatar, name, CID, the site's profile links, sign out.
 *
 * Sign-out posts to the site's own `/api/v1/auth/signout` (`src/signOut.ts`).
 * `afterSignOut` is `reload` on public sites and `web` on gated ones.
 * When the request fails the menu stays open and shows an inline alert.
 *
 * `variant="bar"` sits in a top bar; `variant="rail"` fills a rail row and
 * opens upward. In a collapsed rail only the avatar shows.
 */
import { computed, ref } from "vue";
import Avatar from "./Avatar.vue";
import Icon from "./Icon.vue";
import Popover from "./Popover.vue";
import { CHROME_MESSAGES, createTranslator } from "../i18n";
import type { FrameUser } from "../frame";
import type { NavChild } from "../nav";
import { signOut, type AfterSignOut } from "../signOut";
import type { SiteOrigins } from "../sites";

const props = withDefaults(
  defineProps<{
    user: FrameUser;
    /** Links above sign out. */
    profileItems?: NavChild[];
    afterSignOut?: AfterSignOut;
    variant?: "bar" | "rail";
    collapsed?: boolean;
    messages?: Record<string, unknown>;
    /** Dev/staging origin overrides — reaches the `web` destination. */
    origins?: SiteOrigins;
  }>(),
  {
    profileItems: () => [],
    afterSignOut: "reload",
    variant: "bar",
    collapsed: false,
    messages: () => ({}),
    origins: undefined,
  },
);

const t = createTranslator(props.messages, CHROME_MESSAGES);

const placement = computed<"top-start" | "bottom-end">(() =>
  props.variant === "rail" ? "top-start" : "bottom-end",
);

const signingOut = ref(false);
const failed = ref(false);
async function onSignOut() {
  if (signingOut.value) return;
  signingOut.value = true;
  failed.value = false;
  const ok = await signOut({
    after: props.afterSignOut,
    origins: props.origins,
  });
  // On success the page is already navigating; keep the busy state.
  if (!ok) {
    signingOut.value = false;
    failed.value = true;
  }
}
</script>

<template>
  <!-- Popover renders two roots; this wrapper takes layout classes. -->
  <div :class="variant === 'rail' ? 'w-full [&>span]:w-full' : undefined">
    <Popover :placement="placement" width="15rem" :label="t('openUserMenu')">
      <template #trigger="{ toggle, open }">
        <button
          v-if="variant === 'rail'"
          type="button"
          class="focus-ring rail-item flex w-full items-center gap-2.5 rounded-control px-1.5 py-1.5 transition-colors hover:bg-surface-raised"
          :aria-expanded="open"
          aria-haspopup="menu"
          :aria-label="t('openUserMenu')"
          :title="collapsed ? user.name : undefined"
          @click="toggle"
        >
          <Avatar :name="user.name" />
          <span class="rail-label min-w-0 flex-1 text-left">
            <span class="block truncate text-sm font-semibold text-ink">
              {{ user.name }}
            </span>
            <span class="block truncate font-mono text-xs text-faint">
              #{{ user.id }}
            </span>
          </span>
          <Icon
            name="chevronUpDown"
            class="rail-label size-4 shrink-0 text-faint"
          />
        </button>
        <button
          v-else
          type="button"
          class="focus-ring flex items-center gap-2 rounded-control p-1.5 transition-colors hover:bg-surface-sunken"
          :aria-expanded="open"
          aria-haspopup="menu"
          @click="toggle"
        >
          <span class="sr-only">{{ t("openUserMenu") }}</span>
          <Avatar :name="user.name" />
          <span
            class="hidden max-w-32 truncate text-sm font-semibold text-ink lg:block"
          >
            {{ user.name }}
          </span>
          <Icon
            name="chevronDown"
            :class="[
              'size-4 text-faint transition-transform duration-200',
              open ? 'rotate-180' : '',
            ]"
          />
        </button>
      </template>

      <div role="menu" :aria-label="t('openUserMenu')">
        <div class="border-b border-subtle px-2.5 pb-2 pt-1">
          <p class="truncate text-sm font-semibold text-ink">{{ user.name }}</p>
          <p class="mt-0.5 font-mono text-xs text-faint">#{{ user.id }}</p>
        </div>
        <div class="pt-1">
          <slot name="profileMenu">
            <a
              v-for="item in profileItems"
              :key="item.href"
              :href="item.href"
              role="menuitem"
              class="focus-ring tap-row flex items-center gap-2.5 rounded-control px-2.5 py-2 text-sm text-muted transition-colors hover:bg-surface-raised hover:text-ink"
            >
              <Icon v-if="item.icon" :name="item.icon" class="size-4" />
              {{ item.name }}
            </a>
          </slot>
          <button
            type="button"
            role="menuitem"
            :aria-disabled="signingOut"
            class="focus-ring tap-row flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-left text-sm text-muted transition-colors hover:bg-surface-raised hover:text-danger aria-disabled:opacity-50"
            @click="onSignOut"
          >
            <Icon name="arrowRightOnRectangle" class="size-4" />
            {{ signingOut ? t("signingOut") : t("signOut") }}
          </button>
          <p
            v-if="failed"
            role="alert"
            class="px-2.5 pb-1 pt-0.5 text-xs text-danger"
          >
            {{ t("signOutFailed") }}
          </p>
        </div>
      </div>
    </Popover>
  </div>
</template>
