/**
 * The bell's state in Vue refs, around `notificationPoller.ts`.
 *
 * Inside a component it starts on mount (when `enabled()`) and stops on
 * unmount. `CanFrame` calls it once and hands the result to every
 * placement, so a frame polls once. Outside a component, call `start()`.
 *
 * The fetch comes from `options.fetch`, then an ancestor's
 * `provide(NOTIFICATION_FETCH_KEY, …)`, then the global `fetch`.
 */
import {
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  onMounted,
  ref,
  type InjectionKey,
  type Ref,
} from "vue";
import {
  createNotificationClient,
  createNotificationPoller,
  type NotificationFetch,
  type NotificationPoller,
  type PageVisibility,
  type PollClock,
} from "../notificationPoller";
import type { NotificationItem, NotificationSource } from "../notifications";

export const NOTIFICATION_FETCH_KEY: InjectionKey<NotificationFetch> = Symbol(
  "can-ui.notificationFetch",
);

export interface UseNotificationsOptions {
  fetch?: NotificationFetch;
  clock?: PollClock;
  visibility?: PageVisibility;
  /** Read on mount. Default: start. */
  enabled?: () => boolean;
}

export interface UseNotificationsReturn {
  /** Unread count, 0..99. */
  count: Ref<number>;
  items: Ref<NotificationItem[]>;
  loading: Ref<boolean>;
  next: Ref<string | null>;
  /** 401 or 404 seen: render nothing until the next page load. */
  hidden: Ref<boolean>;
  /** The last list request failed. */
  failed: Ref<boolean>;
  /** A polled count that changed after the first load. For a polite live region. */
  announcement: Ref<number | null>;
  load(): Promise<void>;
  loadMore(): Promise<void>;
  markRead(source: NotificationSource, id: number): Promise<boolean>;
  markAllRead(): Promise<boolean>;
  refresh(): Promise<void>;
  start(): void;
  stop(): void;
}

const browserFetch: NotificationFetch = (input, init) => fetch(input, init);

const browserClock: PollClock = {
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (handle) =>
    globalThis.clearTimeout(handle as ReturnType<typeof globalThis.setTimeout>),
  now: () => Date.now(),
};

const documentVisibility: PageVisibility = {
  isVisible: () =>
    typeof document === "undefined" || document.visibilityState !== "hidden",
  subscribe: (listener) => {
    document.addEventListener("visibilitychange", listener);
    return () => document.removeEventListener("visibilitychange", listener);
  },
};

export function useNotifications(
  options: UseNotificationsOptions = {},
): UseNotificationsReturn {
  const instance = getCurrentInstance();
  const injected = instance
    ? inject(NOTIFICATION_FETCH_KEY, undefined)
    : undefined;
  const client = createNotificationClient(
    options.fetch ?? injected ?? browserFetch,
  );

  const count = ref(0);
  const items = ref<NotificationItem[]>([]);
  const loading = ref(false);
  const next = ref<string | null>(null);
  const hidden = ref(false);
  const failed = ref(false);
  const announcement = ref<number | null>(null);

  let counted = false;
  let poller: NotificationPoller | null = null;

  function gone() {
    hidden.value = true;
    poller?.stop();
  }

  function onCount(value: number) {
    if (counted && value !== count.value) announcement.value = value;
    counted = true;
    count.value = value;
  }

  function start() {
    if (hidden.value || poller?.running) return;
    poller = createNotificationPoller({
      client,
      clock: options.clock ?? browserClock,
      visibility: options.visibility ?? documentVisibility,
      onCount,
      onGone: gone,
    });
    poller.start();
  }

  function stop() {
    poller?.stop();
  }

  async function refresh() {
    await poller?.refresh();
  }

  async function fetchPage(before: string | null, append: boolean) {
    loading.value = true;
    failed.value = false;
    const result = await client.page(before);
    loading.value = false;
    if (result.ok) {
      const incoming = append
        ? result.value.items.filter(
            (row) =>
              !items.value.some(
                (have) => have.id === row.id && have.source === row.source,
              ),
          )
        : result.value.items;
      items.value = append ? [...items.value, ...incoming] : incoming;
      next.value = result.value.next;
    } else if (result.gone) {
      gone();
    } else {
      failed.value = true;
    }
  }

  async function load() {
    if (hidden.value) return;
    await fetchPage(null, false);
  }

  async function loadMore() {
    if (hidden.value || loading.value || !next.value) return;
    await fetchPage(next.value, true);
  }

  async function markRead(source: NotificationSource, id: number) {
    const row = items.value.find(
      (have) => have.source === source && have.id === id,
    );
    if (row && !row.read) {
      items.value = items.value.map((have) =>
        have === row ? { ...have, read: true } : have,
      );
      count.value = Math.max(0, count.value - 1);
    }
    const result = await client.markRead(source, id);
    if (!result.ok && result.gone) gone();
    return result.ok;
  }

  async function markAllRead() {
    // The server clears rows created up to the newest one loaded; newer rows
    // stay unread, so the count is what is left of them locally.
    const upTo = items.value[0]?.createdAt;
    const limit = upTo === undefined ? Infinity : Date.parse(upTo);
    items.value = items.value.map((have) =>
      have.read || Date.parse(have.createdAt) > limit
        ? have
        : { ...have, read: true },
    );
    count.value = Math.min(
      count.value,
      items.value.filter((have) => !have.read).length,
    );
    const result = await client.markAllRead(upTo);
    if (!result.ok && result.gone) gone();
    return result.ok;
  }

  if (instance) {
    onMounted(() => {
      if (options.enabled?.() ?? true) start();
    });
    onBeforeUnmount(stop);
  }

  return {
    count,
    items,
    loading,
    next,
    hidden,
    failed,
    announcement,
    load,
    loadMore,
    markRead,
    markAllRead,
    refresh,
    start,
    stop,
  };
}
