<script setup lang="ts">
/**
 * The notification list: heading and mark-all-read, rows newest first, load
 * more, empty state, loading skeleton. Rendered in `NotificationBell`'s
 * Popover and in the rail layout's phone "Me" sheet. Internal.
 *
 * A row is a link when its site is known. Clicking marks it read, then
 * navigates: same site by path, other sites by full origin. A modified click
 * (new tab) marks it read and lets the browser proceed.
 */
import { computed, nextTick, ref } from "vue";
import Icon from "./Icon.vue";
import type { UseNotificationsReturn } from "../composables/useNotifications";
import { CHROME_MESSAGES, createTranslator } from "../i18n";
import {
  notificationChrome,
  renderNotification,
} from "../notificationMessages";
import {
  notificationHref,
  notificationIcon,
  notificationTime,
  type NotificationItem,
} from "../notifications";
import type { SiteKey, SiteOrigins } from "../sites";

const props = withDefaults(
  defineProps<{
    state: UseNotificationsReturn;
    locale: string;
    current: SiteKey;
    origins?: SiteOrigins;
    messages?: Record<string, unknown>;
  }>(),
  { origins: undefined, messages: () => ({}) },
);

const t = createTranslator(props.messages, {
  ...CHROME_MESSAGES,
  ...notificationChrome(props.locale),
});

const { items, loading, next, failed, count } = props.state;
// Older unread rows may not be loaded, so the count counts too.
const canMarkAll = computed(
  () => count.value > 0 || items.value.some((item) => !item.read),
);
const heading = ref<HTMLElement | null>(null);
const markAllButton = ref<HTMLButtonElement | null>(null);
const moreButton = ref<HTMLButtonElement | null>(null);

/** A focused control that disables or unmounts hands focus to the heading. */
async function markAll() {
  await props.state.markAllRead();
  await nextTick();
  if (markAllButton.value?.disabled) heading.value?.focus();
}
async function loadMore() {
  await props.state.loadMore();
  await nextTick();
  if (!moreButton.value) heading.value?.focus();
}

// The list mounts when the panel opens, so "now" is fresh per open.
const now = Date.now();

function hrefFor(item: NotificationItem): string | null {
  return notificationHref(item, props.current, props.origins);
}

function rowAttrs(item: NotificationItem): Record<string, string> {
  const href = hrefFor(item);
  return href ? { href } : { type: "button" };
}

// The row is marked read locally at once; the request is `keepalive`, so it
// outlives the navigation. The anchor's own navigation then proceeds, so a
// site's client-side router still handles same-site links.
function onItemClick(item: NotificationItem) {
  void props.state.markRead(item.source, item.id);
}

/** Middle-click opens a new tab through `auxclick`, not `click`. */
function onItemAuxClick(event: MouseEvent, item: NotificationItem) {
  if (event.button === 1) void props.state.markRead(item.source, item.id);
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex items-center gap-2 px-2.5 pb-2 pt-1">
      <slot name="lead" />
      <h2
        ref="heading"
        tabindex="-1"
        class="text-sm font-semibold text-ink focus:outline-none"
      >
        {{ t("notifications.title") }}
      </h2>
      <button
        ref="markAllButton"
        type="button"
        class="focus-ring ml-auto rounded-control px-2 py-1 text-xs font-medium text-can transition-colors hover:bg-surface-raised disabled:opacity-40"
        :disabled="!canMarkAll"
        @click="markAll"
      >
        {{ t("notifications.markAllRead") }}
      </button>
    </div>

    <div
      v-if="loading && items.length === 0"
      role="status"
      aria-busy="true"
      class="flex flex-col"
    >
      <div
        v-for="n in 3"
        :key="n"
        class="flex items-start gap-3 px-2.5 py-2"
        aria-hidden="true"
      >
        <span class="skeleton size-8 shrink-0 rounded-full"></span>
        <span class="flex flex-1 flex-col gap-1.5 pt-0.5">
          <span class="skeleton h-3.5 w-full"></span>
          <span class="skeleton h-3 w-1/3"></span>
        </span>
      </div>
    </div>

    <div
      v-else-if="failed && items.length === 0"
      class="flex flex-col items-center gap-2 px-2.5 py-8 text-sm text-muted"
    >
      <p>{{ t("notifications.loadFailed") }}</p>
      <button
        type="button"
        class="btn btn-secondary px-3 py-1.5 text-sm"
        @click="state.load()"
      >
        {{ t("notifications.retry") }}
      </button>
    </div>

    <p
      v-else-if="items.length === 0"
      class="px-2.5 py-8 text-center text-sm text-muted"
    >
      {{ t("notifications.empty") }}
    </p>

    <ul v-else class="flex flex-col gap-0.5">
      <li v-for="item in items" :key="`${item.source}:${item.id}`">
        <component
          :is="hrefFor(item) ? 'a' : 'button'"
          v-bind="rowAttrs(item)"
          class="focus-ring tap-row flex w-full items-start gap-3 rounded-control px-2.5 py-2 text-left transition-colors hover:bg-surface-raised"
          @click="onItemClick(item)"
          @auxclick="onItemAuxClick($event, item)"
        >
          <span
            class="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-muted"
          >
            <Icon :name="notificationIcon(item.kind)" class="size-4" />
          </span>
          <span class="min-w-0 flex-1">
            <span
              :class="[
                'line-clamp-2 text-sm',
                item.read ? 'text-muted' : 'font-medium text-ink',
              ]"
            >
              {{ renderNotification(item, locale) }}
            </span>
            <time
              :datetime="item.createdAt"
              class="mt-0.5 block text-xs text-faint"
            >
              {{ notificationTime(item.createdAt, now, locale) }}
            </time>
          </span>
          <span
            v-if="!item.read"
            class="mt-2 size-2 shrink-0 rounded-full bg-can"
          >
            <span class="sr-only">{{ t("notifications.unread") }}</span>
          </span>
        </component>
      </li>
    </ul>

    <button
      v-if="next"
      ref="moreButton"
      type="button"
      class="focus-ring tap-row mt-1 w-full rounded-control px-2.5 py-2 text-center text-sm font-medium text-can transition-colors hover:bg-surface-raised disabled:opacity-50"
      :disabled="loading"
      @click="loadMore"
    >
      {{ t("notifications.loadMore") }}
    </button>
  </div>
</template>
