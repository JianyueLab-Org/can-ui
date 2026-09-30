import { describe, expect, test } from "bun:test";
import {
  BACKOFF_INTERVAL_MS,
  POLL_INTERVAL_MS,
  createNotificationClient,
  createNotificationPoller,
  type NotificationFetch,
  type NotificationResponse,
  type PageVisibility,
  type PollClock,
  type RequestResult,
} from "./notificationPoller";

const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const reply = (status: number, body?: unknown): NotificationResponse => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

function fakeFetch(
  respond: (input: string, init: RequestInit) => NotificationResponse,
) {
  const calls: Array<[string, RequestInit]> = [];
  const send: NotificationFetch = async (input, init) => {
    calls.push([input, init]);
    return respond(input, init);
  };
  return { send, calls };
}

class FakeClock implements PollClock {
  time = 0;
  private seq = 0;
  private timers = new Map<number, { at: number; fn: () => void }>();
  setTimeout(fn: () => void, ms: number): number {
    this.seq += 1;
    this.timers.set(this.seq, { at: this.time + ms, fn });
    return this.seq;
  }
  clearTimeout(handle: unknown): void {
    this.timers.delete(handle as number);
  }
  now(): number {
    return this.time;
  }
  pending(): number[] {
    return [...this.timers.values()].map((t) => t.at).sort((a, b) => a - b);
  }
  async advance(ms: number): Promise<void> {
    const end = this.time + ms;
    for (;;) {
      const due = [...this.timers.entries()]
        .filter(([, t]) => t.at <= end)
        .sort((a, b) => a[1].at - b[1].at)[0];
      if (!due) break;
      this.timers.delete(due[0]);
      this.time = due[1].at;
      due[1].fn();
      await flush();
    }
    this.time = end;
  }
}

class FakeVisibility implements PageVisibility {
  visible = true;
  listeners = new Set<() => void>();
  isVisible(): boolean {
    return this.visible;
  }
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  set(visible: boolean): void {
    this.visible = visible;
    for (const listener of this.listeners) listener();
  }
}

function fakeClient(results: RequestResult<number>[]) {
  const client = {
    calls: 0,
    async unread(): Promise<RequestResult<number>> {
      client.calls += 1;
      return results.shift() ?? { ok: true, value: 0 };
    },
  };
  return client;
}

const OK = (value: number): RequestResult<number> => ({ ok: true, value });
const FAIL: RequestResult<number> = { ok: false, gone: false };
const GONE: RequestResult<number> = { ok: false, gone: true };

function setup(results: RequestResult<number>[]) {
  const clock = new FakeClock();
  const visibility = new FakeVisibility();
  const client = fakeClient(results);
  const counts: number[] = [];
  let gone = 0;
  const poller = createNotificationPoller({
    client,
    clock,
    visibility,
    onCount: (count) => counts.push(count),
    onGone: () => {
      gone += 1;
    },
  });
  return { clock, visibility, client, counts, poller, gone: () => gone };
}

describe("createNotificationClient", () => {
  test("unread: same-origin GET with credentials, count capped at 99", async () => {
    const { send, calls } = fakeFetch(() => reply(200, { count: 120 }));
    const result = await createNotificationClient(send).unread();
    expect(result).toEqual({ ok: true, value: 99 });
    expect(calls).toEqual([
      [
        "/api/v1/notifications/unread",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
          headers: { Accept: "application/json" },
        },
      ],
    ]);
  });

  test("unread: 401 and 404 are gone; 500, a throw and a bad body are failures", async () => {
    const run = async (respond: () => NotificationResponse) =>
      createNotificationClient(fakeFetch(respond).send).unread();
    expect(await run(() => reply(401))).toEqual({ ok: false, gone: true });
    expect(await run(() => reply(404))).toEqual({ ok: false, gone: true });
    expect(await run(() => reply(500))).toEqual({ ok: false, gone: false });
    expect(await run(() => reply(200, { nope: 1 }))).toEqual({
      ok: false,
      gone: false,
    });
    expect(
      await createNotificationClient(async () => {
        throw new Error("offline");
      }).unread(),
    ).toEqual({ ok: false, gone: false });
  });

  test("page: first page, then by cursor; malformed rows dropped", async () => {
    const good = {
      id: 3,
      source: "member",
      kind: "promotion.approved",
      params: { toRating: 3 },
      site: "web",
      path: "/pilots",
      createdAt: "2026-09-30T08:00:00Z",
      read: false,
    };
    const { send, calls } = fakeFetch(() =>
      reply(200, { items: [good, { id: "x" }], next: "c2" }),
    );
    const client = createNotificationClient(send);
    expect(await client.page()).toEqual({
      ok: true,
      value: { items: [good as never], next: "c2" },
    });
    await client.page("c2");
    expect(calls.map(([input]) => input)).toEqual([
      "/api/v1/notifications?limit=20",
      "/api/v1/notifications?before=c2&limit=20",
    ]);
  });

  test("page: next is null when absent or empty", async () => {
    const { send } = fakeFetch(() => reply(200, { items: [], next: "" }));
    expect(await createNotificationClient(send).page()).toEqual({
      ok: true,
      value: { items: [], next: null },
    });
  });

  test("markRead: PATCH with { read: true }; 401 gone, 404 a failure", async () => {
    let status = 204;
    const { send, calls } = fakeFetch(() => reply(status));
    const client = createNotificationClient(send);
    expect(await client.markRead("broadcast", 7)).toEqual({
      ok: true,
      value: true,
    });
    expect(calls[0]).toEqual([
      "/api/v1/notifications/broadcast/7",
      {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      },
    ]);
    status = 404;
    expect(await client.markRead("member", 1)).toEqual({
      ok: false,
      gone: false,
    });
    status = 401;
    expect(await client.markRead("member", 1)).toEqual({
      ok: false,
      gone: true,
    });
  });

  test("markAllRead: POST read-all with upTo; bare when absent", async () => {
    const { send, calls } = fakeFetch(() => reply(204));
    const client = createNotificationClient(send);
    expect(await client.markAllRead("2026-09-30T08:00:00Z")).toEqual({
      ok: true,
      value: true,
    });
    expect(calls[0]).toEqual([
      "/api/v1/notifications/read-all",
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ upTo: "2026-09-30T08:00:00Z" }),
      },
    ]);
    await client.markAllRead();
    expect(calls[1]).toEqual([
      "/api/v1/notifications/read-all",
      { method: "POST", credentials: "include" },
    ]);
  });
});

describe("createNotificationPoller", () => {
  test("fetches on start, then every 60 s while visible", async () => {
    const s = setup([OK(1), OK(2), OK(3)]);
    s.poller.start();
    await flush();
    expect(s.counts).toEqual([1]);
    expect(s.clock.pending()).toEqual([POLL_INTERVAL_MS]);
    await s.clock.advance(POLL_INTERVAL_MS);
    await s.clock.advance(POLL_INTERVAL_MS);
    expect(s.counts).toEqual([1, 2, 3]);
  });

  test("no requests while hidden; fetches at once on becoming visible", async () => {
    const s = setup([OK(1), OK(4)]);
    s.poller.start();
    await flush();
    s.visibility.set(false);
    expect(s.clock.pending()).toEqual([]);
    await s.clock.advance(10 * POLL_INTERVAL_MS);
    expect(s.client.calls).toBe(1);
    s.visibility.set(true);
    await flush();
    expect(s.client.calls).toBe(2);
    expect(s.counts).toEqual([1, 4]);
    expect(s.clock.pending()).toEqual([
      10 * POLL_INTERVAL_MS + POLL_INTERVAL_MS,
    ]);
  });

  test("starting hidden makes no request until visible", async () => {
    const s = setup([OK(2)]);
    s.visibility.visible = false;
    s.poller.start();
    await flush();
    expect(s.client.calls).toBe(0);
    s.visibility.set(true);
    await flush();
    expect(s.counts).toEqual([2]);
  });

  test("three consecutive failures back off to 5 min; a success restores 60 s", async () => {
    const s = setup([FAIL, FAIL, FAIL, OK(5)]);
    s.poller.start();
    await flush();
    await s.clock.advance(POLL_INTERVAL_MS);
    expect(s.poller.failures).toBe(2);
    expect(s.clock.pending()).toEqual([2 * POLL_INTERVAL_MS]);
    await s.clock.advance(POLL_INTERVAL_MS);
    expect(s.poller.failures).toBe(3);
    expect(s.clock.pending()).toEqual([
      2 * POLL_INTERVAL_MS + BACKOFF_INTERVAL_MS,
    ]);
    await s.clock.advance(BACKOFF_INTERVAL_MS - 1);
    expect(s.client.calls).toBe(3);
    await s.clock.advance(1);
    expect(s.client.calls).toBe(4);
    expect(s.counts).toEqual([5]);
    expect(s.poller.failures).toBe(0);
    expect(s.clock.pending()).toEqual([
      2 * POLL_INTERVAL_MS + BACKOFF_INTERVAL_MS + POLL_INTERVAL_MS,
    ]);
  });

  test("a failure keeps the last count (no error badge)", async () => {
    const s = setup([OK(3), FAIL]);
    s.poller.start();
    await flush();
    await s.clock.advance(POLL_INTERVAL_MS);
    expect(s.counts).toEqual([3]);
  });

  test("gone stops polling for good", async () => {
    const s = setup([OK(1), GONE]);
    s.poller.start();
    await flush();
    await s.clock.advance(POLL_INTERVAL_MS);
    expect(s.gone()).toBe(1);
    expect(s.poller.running).toBe(false);
    expect(s.clock.pending()).toEqual([]);
    expect(s.visibility.listeners.size).toBe(0);
    s.visibility.set(false);
    s.visibility.set(true);
    await flush();
    expect(s.client.calls).toBe(2);
  });

  test("stop clears the timer and the listener", async () => {
    const s = setup([OK(1)]);
    s.poller.start();
    await flush();
    s.poller.stop();
    expect(s.clock.pending()).toEqual([]);
    expect(s.visibility.listeners.size).toBe(0);
    await s.clock.advance(5 * POLL_INTERVAL_MS);
    expect(s.client.calls).toBe(1);
  });
});
