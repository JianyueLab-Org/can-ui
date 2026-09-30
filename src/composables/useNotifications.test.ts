import { describe, expect, test } from "bun:test";
import type {
  NotificationFetch,
  NotificationResponse,
  PageVisibility,
  PollClock,
} from "../notificationPoller";
import type { NotificationItem, NotificationSource } from "../notifications";
import { useNotifications } from "./useNotifications";

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));
const idleClock: PollClock = {
  setTimeout: () => 0,
  clearTimeout: () => {},
  now: () => 0,
};
const visible: PageVisibility = {
  isVisible: () => true,
  subscribe: () => () => {},
};
const reply = (status: number, body?: unknown): NotificationResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

function item(
  id: number,
  read = false,
  source: NotificationSource = "member",
): NotificationItem {
  return {
    id,
    source,
    kind: "promotion.approved",
    params: { toRating: 3 },
    site: "web",
    path: "/pilots",
    createdAt: "2026-09-30T08:00:00Z",
    read,
  };
}

/** Routes keyed `METHOD path`; anything else answers 500. */
function server(routes: Record<string, () => NotificationResponse>) {
  const calls: Array<[string, RequestInit]> = [];
  const fetch: NotificationFetch = async (input, init) => {
    calls.push([input, init]);
    const route = routes[`${init.method} ${input}`];
    return route ? route() : reply(500);
  };
  return { fetch, calls };
}

function make(routes: Record<string, () => NotificationResponse>) {
  const s = server(routes);
  const n = useNotifications({
    fetch: s.fetch,
    clock: idleClock,
    visibility: visible,
  });
  return { ...s, n };
}

describe("useNotifications", () => {
  test("the first count is not announced; a later change is", async () => {
    let count = 3;
    const { n } = make({
      "GET /api/v1/notifications/unread": () => reply(200, { count }),
    });
    n.start();
    await flush();
    expect(n.count.value).toBe(3);
    expect(n.announcement.value).toBeNull();
    await n.refresh();
    expect(n.announcement.value).toBeNull();
    count = 5;
    await n.refresh();
    expect(n.count.value).toBe(5);
    expect(n.announcement.value).toBe(5);
  });

  test("load, then loadMore appends without duplicates", async () => {
    const { n, calls } = make({
      "GET /api/v1/notifications?limit=20": () =>
        reply(200, { items: [item(3), item(2, true)], next: "c2" }),
      "GET /api/v1/notifications?before=c2&limit=20": () =>
        reply(200, {
          items: [item(2, true), item(1, true, "broadcast")],
          next: null,
        }),
    });
    await n.load();
    expect(n.items.value.map((i) => i.id)).toEqual([3, 2]);
    expect(n.next.value).toBe("c2");
    expect(n.loading.value).toBe(false);
    await n.loadMore();
    expect(n.items.value.map((i) => `${i.source}:${i.id}`)).toEqual([
      "member:3",
      "member:2",
      "broadcast:1",
    ]);
    expect(n.next.value).toBeNull();
    const before = calls.length;
    await n.loadMore();
    expect(calls.length).toBe(before);
  });

  test("markRead marks the row and lowers the count once", async () => {
    const { n, calls } = make({
      "GET /api/v1/notifications/unread": () => reply(200, { count: 1 }),
      "GET /api/v1/notifications?limit=20": () =>
        reply(200, { items: [item(3), item(2, true)], next: null }),
      "PATCH /api/v1/notifications/member/3": () => reply(204),
      "PATCH /api/v1/notifications/member/2": () => reply(204),
    });
    n.start();
    await flush();
    await n.load();
    expect(await n.markRead("member", 3)).toBe(true);
    expect(n.items.value[0]!.read).toBe(true);
    expect(n.count.value).toBe(0);
    await n.markRead("member", 2);
    expect(n.count.value).toBe(0);
    expect(n.announcement.value).toBeNull();
    expect(
      calls.some(([input]) => input === "/api/v1/notifications/member/3"),
    ).toBe(true);
  });

  test("markAllRead sends upTo and clears only rows up to it", async () => {
    const newest = { ...item(3), createdAt: "2026-09-30T09:00:00Z" };
    const newer = { ...item(4), createdAt: "2026-09-30T09:30:00Z" };
    const older = { ...item(1, false, "broadcast") };
    const { n, calls } = make({
      "GET /api/v1/notifications/unread": () => reply(200, { count: 3 }),
      "GET /api/v1/notifications?limit=20": () =>
        reply(200, { items: [newest, older], next: null }),
      "POST /api/v1/notifications/read-all": () => reply(204),
    });
    n.start();
    await flush();
    await n.load();
    // A row arrives after the list loaded and is shown unread (e.g. prepended).
    n.items.value = [newer, ...n.items.value];
    expect(await n.markAllRead()).toBe(true);
    const post = calls.find(([, init]) => init.method === "POST")!;
    expect(post[1].body).toBe(JSON.stringify({ upTo: "2026-09-30T09:30:00Z" }));
    expect(n.items.value.every((i) => i.read)).toBe(true);
    expect(n.count.value).toBe(0);
  });

  test("markAllRead leaves rows newer than upTo unread and counts them", async () => {
    const a = { ...item(3), createdAt: "2026-09-30T09:00:00Z" };
    const b = { ...item(2), createdAt: "2026-09-30T08:00:00Z" };
    const { n } = make({
      "GET /api/v1/notifications/unread": () => reply(200, { count: 2 }),
      "GET /api/v1/notifications?limit=20": () =>
        reply(200, { items: [a, b], next: null }),
      "POST /api/v1/notifications/read-all": () => reply(204),
    });
    n.start();
    await flush();
    await n.load();
    // Items are newest first; a row inserted out of order is newer than upTo.
    n.items.value = [a, { ...b, createdAt: "2026-09-30T09:30:00Z" }];
    await n.markAllRead();
    expect(n.items.value.map((i) => i.read)).toEqual([true, false]);
    expect(n.count.value).toBe(1);
  });

  test("markAllRead with nothing loaded sends no upTo", async () => {
    const { n, calls } = make({
      "POST /api/v1/notifications/read-all": () => reply(204),
    });
    expect(await n.markAllRead()).toBe(true);
    expect(calls[0]![1].body).toBeUndefined();
    expect(n.count.value).toBe(0);
  });

  test("404 on the count hides the bell and stops all requests", async () => {
    const { n, calls } = make({
      "GET /api/v1/notifications/unread": () => reply(404),
    });
    n.start();
    await flush();
    expect(n.hidden.value).toBe(true);
    await n.load();
    expect(calls.length).toBe(1);
  });

  test("401 on markRead hides the bell", async () => {
    const { n } = make({
      "PATCH /api/v1/notifications/member/3": () => reply(401),
    });
    expect(await n.markRead("member", 3)).toBe(false);
    expect(n.hidden.value).toBe(true);
  });

  test("a failed list sets failed, not hidden", async () => {
    const { n } = make({});
    await n.load();
    expect(n.failed.value).toBe(true);
    expect(n.hidden.value).toBe(false);
    expect(n.loading.value).toBe(false);
  });
});
