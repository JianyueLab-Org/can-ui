/**
 * The bell's requests and its polling loop. No Vue, no DOM: fetch, clock and
 * page visibility are injected, so `bun test` drives them.
 *
 * Count: on start, on becoming visible, every 60 s while visible. Nothing
 * while hidden. Three consecutive failures → every 5 min. 401 or 404 on a
 * read → `onGone` and the loop stops for good (no session, or a site whose
 * proxy does not forward these paths).
 */
import {
  NOTIFICATIONS_READ_ALL_PATH,
  NOTIFICATIONS_UNREAD_PATH,
  notificationReadPath,
  notificationsListPath,
  type NotificationItem,
  type NotificationPage,
  type NotificationSource,
} from "./notifications";

export interface NotificationResponse {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export type NotificationFetch = (
  input: string,
  init: RequestInit,
) => Promise<NotificationResponse>;

export interface PollClock {
  setTimeout(fn: () => void, ms: number): unknown;
  clearTimeout(handle: unknown): void;
  now(): number;
}

export interface PageVisibility {
  isVisible(): boolean;
  /** Called on every visibility change. Returns the unsubscribe. */
  subscribe(listener: () => void): () => void;
}

export type RequestResult<T> =
  { ok: true; value: T } | { ok: false; gone: boolean };

export const POLL_INTERVAL_MS = 60_000;
export const BACKOFF_INTERVAL_MS = 300_000;
export const BACKOFF_AFTER_FAILURES = 3;

const FAILED = { ok: false, gone: false } as const;
const GONE = { ok: false, gone: true } as const;
const READ_GONE: readonly number[] = [401, 404];
const WRITE_GONE: readonly number[] = [401];

const GET_INIT: RequestInit = {
  method: "GET",
  credentials: "include",
  cache: "no-store",
  headers: { Accept: "application/json" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseCount(body: unknown): number | undefined {
  if (!isRecord(body) || typeof body.count !== "number") return undefined;
  if (!Number.isFinite(body.count)) return undefined;
  return Math.max(0, Math.min(99, Math.trunc(body.count)));
}

function isItem(value: unknown): value is NotificationItem {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    (value.source === "member" || value.source === "broadcast") &&
    typeof value.kind === "string" &&
    isRecord(value.params) &&
    typeof value.site === "string" &&
    typeof value.path === "string" &&
    typeof value.createdAt === "string" &&
    typeof value.read === "boolean"
  );
}

function parsePage(body: unknown): NotificationPage | undefined {
  if (!isRecord(body) || !Array.isArray(body.items)) return undefined;
  return {
    items: body.items.filter(isItem),
    next: typeof body.next === "string" && body.next ? body.next : null,
  };
}

async function perform<T>(
  send: NotificationFetch,
  path: string,
  init: RequestInit,
  goneOn: readonly number[],
  parse: (response: NotificationResponse) => Promise<T | undefined>,
): Promise<RequestResult<T>> {
  let response: NotificationResponse;
  try {
    response = await send(path, init);
  } catch {
    return FAILED;
  }
  if (goneOn.includes(response.status)) return GONE;
  if (!response.ok) return FAILED;
  let value: T | undefined;
  try {
    value = await parse(response);
  } catch {
    return FAILED;
  }
  return value === undefined ? FAILED : { ok: true, value };
}

export interface NotificationClient {
  unread(): Promise<RequestResult<number>>;
  page(before?: string | null): Promise<RequestResult<NotificationPage>>;
  markRead(
    source: NotificationSource,
    id: number,
  ): Promise<RequestResult<true>>;
  /** `upTo`: `createdAt` of the newest loaded row. Absent: now. */
  markAllRead(upTo?: string): Promise<RequestResult<true>>;
}

export function createNotificationClient(
  send: NotificationFetch,
): NotificationClient {
  return {
    unread: () =>
      perform(send, NOTIFICATIONS_UNREAD_PATH, GET_INIT, READ_GONE, async (r) =>
        parseCount(await r.json()),
      ),
    page: (before) =>
      perform(
        send,
        notificationsListPath(before),
        GET_INIT,
        READ_GONE,
        async (r) => parsePage(await r.json()),
      ),
    markRead: (source, id) =>
      perform(
        send,
        notificationReadPath(source, id),
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        },
        WRITE_GONE,
        async () => true as const,
      ),
    markAllRead: (upTo) =>
      perform(
        send,
        NOTIFICATIONS_READ_ALL_PATH,
        upTo
          ? {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ upTo }),
            }
          : { method: "POST", credentials: "include" },
        WRITE_GONE,
        async () => true as const,
      ),
  };
}

export interface NotificationPollerOptions {
  client: Pick<NotificationClient, "unread">;
  clock: PollClock;
  visibility: PageVisibility;
  onCount(count: number): void;
  /** 401 or 404: hide the bell until the next page load. */
  onGone(): void;
}

export interface NotificationPoller {
  start(): void;
  stop(): void;
  /** Fetch the count now, when visible and not already fetching. */
  refresh(): Promise<void>;
  readonly failures: number;
  readonly running: boolean;
}

export function createNotificationPoller(
  options: NotificationPollerOptions,
): NotificationPoller {
  const { client, clock, visibility } = options;
  let timer: unknown = null;
  let unsubscribe: (() => void) | null = null;
  let failures = 0;
  let running = false;
  let inFlight = false;

  function clear() {
    if (timer !== null) {
      clock.clearTimeout(timer);
      timer = null;
    }
  }

  function schedule() {
    clear();
    if (!running || !visibility.isVisible()) return;
    const delay =
      failures >= BACKOFF_AFTER_FAILURES
        ? BACKOFF_INTERVAL_MS
        : POLL_INTERVAL_MS;
    timer = clock.setTimeout(() => {
      timer = null;
      void refresh();
    }, delay);
  }

  async function refresh() {
    if (!running || inFlight || !visibility.isVisible()) return;
    inFlight = true;
    clear();
    let result: RequestResult<number>;
    try {
      result = await client.unread();
    } catch {
      result = FAILED;
    } finally {
      inFlight = false;
    }
    if (!running) return;
    if (result.ok) {
      failures = 0;
      options.onCount(result.value);
    } else if (result.gone) {
      stop();
      options.onGone();
      return;
    } else {
      failures += 1;
    }
    schedule();
  }

  function onVisibility() {
    if (!running) return;
    if (visibility.isVisible()) void refresh();
    else clear();
  }

  function start() {
    if (running) return;
    running = true;
    unsubscribe = visibility.subscribe(onVisibility);
    void refresh();
  }

  function stop() {
    running = false;
    clear();
    unsubscribe?.();
    unsubscribe = null;
  }

  return {
    start,
    stop,
    refresh,
    get failures() {
      return failures;
    },
    get running() {
      return running;
    },
  };
}
