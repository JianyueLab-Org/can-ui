<script setup lang="ts">
/**
 * The notification bell: a trigger with an unread badge, and a Popover
 * holding `NotificationList`.
 *
 * `CanFrame` renders it when `notifications` is set and a member is signed
 * in, and passes one shared `state`. Used on its own (a site's
 * `notifications` slot) it polls by itself and renders its own polite live
 * region.
 *
 * `variant="bar"`: icon button, panel `bottom-end`. `variant="rail"`: rail
 * row with label and badge, panel `right-start`; `collapsed` shows the icon
 * with a corner badge.
 *
 * Opening the panel loads the list and marks nothing read. Escape closes it
 * and returns focus to the trigger (Popover's `useOverlay`).
 */
import { computed, ref, watch } from "vue";
import Icon from "./Icon.vue";
import NotificationBadge from "./NotificationBadge.vue";
import NotificationList from "./NotificationList.vue";
import Popover from "./Popover.vue";
import {
  useNotifications,
  type UseNotificationsReturn,
} from "../composables/useNotifications";
import { CHROME_MESSAGES, createTranslator } from "../i18n";
import { notificationChrome } from "../notificationMessages";
import { notificationBadgeText } from "../notifications";
import type { SiteKey, SiteOrigins } from "../sites";

const props = withDefaults(
  defineProps<{
    locale: string;
    current: SiteKey;
    origins?: SiteOrigins;
    messages?: Record<string, unknown>;
    variant?: "bar" | "rail";
    collapsed?: boolean;
    /** Shared state from `CanFrame`. Absent: the bell polls by itself. */
    state?: UseNotificationsReturn;
  }>(),
  {
    origins: undefined,
    messages: () => ({}),
    variant: "bar",
    collapsed: false,
    state: undefined,
  },
);

const owns = props.state === undefined;
const state = props.state ?? useNotifications();
const { count, hidden, announcement } = state;

const t = createTranslator(props.messages, {
  ...CHROME_MESSAGES,
  ...notificationChrome(props.locale),
});

const badge = computed(() => notificationBadgeText(count.value));
const label = computed(() =>
  badge.value
    ? t("notifications.labelCount", { count: badge.value })
    : t("notifications.label"),
);
const announcementText = computed(() =>
  announcement.value === null
    ? ""
    : t("notifications.announce", {
        count: notificationBadgeText(announcement.value) || "0",
      }),
);

const open = ref(false);
watch(open, (isOpen) => {
  if (isOpen) void state.load();
});
</script>

<template>
  <!-- Popover renders two roots; this wrapper takes layout classes. -->
  <div
    v-if="!hidden"
    :class="variant === 'rail' ? 'w-full [&>span]:w-full' : 'flex'"
  >
    <Popover
      v-model:open="open"
      :placement="variant === 'rail' ? 'right-start' : 'bottom-end'"
      :offset="variant === 'rail' ? 21 : 8"
      width="22rem"
      :label="t('notifications.title')"
    >
      <template #trigger="{ toggle, open: isOpen }">
        <button
          v-if="variant === 'rail'"
          type="button"
          class="focus-ring rail-item flex w-full items-center gap-2.5 rounded-control px-2.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface-raised hover:text-ink"
          :aria-label="label"
          aria-haspopup="dialog"
          :aria-expanded="isOpen"
          :title="collapsed ? label : undefined"
          @click="toggle"
        >
          <span class="relative flex shrink-0">
            <Icon name="bell" class="size-5" />
            <NotificationBadge
              v-if="collapsed"
              :text="badge"
              class="-right-2 -top-1.5"
            />
          </span>
          <span class="rail-label truncate">
            {{ t("notifications.label") }}
          </span>
          <NotificationBadge
            v-if="!collapsed"
            :text="badge"
            variant="pill"
            class="rail-label ml-auto shrink-0"
          />
        </button>
        <button
          v-else
          type="button"
          class="icon-button focus-ring relative"
          :aria-label="label"
          aria-haspopup="dialog"
          :aria-expanded="isOpen"
          @click="toggle"
        >
          <Icon name="bell" class="size-5" />
          <NotificationBadge :text="badge" class="-right-0.5 -top-0.5" />
        </button>
      </template>

      <NotificationList
        :state="state"
        :locale="locale"
        :current="current"
        :origins="origins"
        :messages="messages"
      />
    </Popover>
    <span v-if="owns" class="sr-only" aria-live="polite">
      {{ announcementText }}
    </span>
  </div>
</template>
