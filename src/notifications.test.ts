import { describe, expect, test } from "bun:test";
import { ICON_NAMES } from "./icons";
import {
  NOTIFICATION_KINDS,
  NOTIFICATION_PARAMS,
  NOTIFICATIONS_READ_ALL_PATH,
  NOTIFICATIONS_UNREAD_PATH,
  notificationBadgeText,
  notificationHref,
  notificationIcon,
  notificationReadPath,
  notificationsListPath,
  notificationTime,
} from "./notifications";
import { ratingShort } from "./ratings";

/** The contract's list, verbatim. can-api holds the same strings as Go constants. */
const CONTRACT_KINDS = [
  "promotion.raised",
  "promotion.approved",
  "promotion.rejected",
  "rating.changed",
  "exam.passed",
  "exam.failed",
  "activity.published",
  "activity.changed",
  "activity.cancelled",
  "activity.seatReleased",
  "activity.settled",
  "reservation.cancelledByStaff",
  "lottery.won",
  "redemption.issued",
  "redemption.cancelled",
  "leaderboard.credited",
  "security.passwordChanged",
  "security.emailChanged",
  "security.newSignIn",
  "oauth.authorized",
  "oauth.revoked",
  "access.developerGranted",
  "access.developerRevoked",
  "access.aipGranted",
  "access.aipRevoked",
];

describe("kinds", () => {
  test("match the contract exactly", () => {
    expect<string[]>([...NOTIFICATION_KINDS]).toEqual(CONTRACT_KINDS);
  });

  test("every kind has a params entry, and no other key does", () => {
    expect(Object.keys(NOTIFICATION_PARAMS).sort()).toEqual(
      [...CONTRACT_KINDS].sort(),
    );
  });

  test("params match the contract", () => {
    expect(NOTIFICATION_PARAMS["promotion.approved"]).toEqual([
      "toRating",
      "comment",
    ]);
    expect(NOTIFICATION_PARAMS["exam.passed"]).toEqual([
      "paper",
      "score",
      "promoted",
    ]);
    expect(NOTIFICATION_PARAMS["security.newSignIn"]).toEqual([
      "browser",
      "os",
      "ipPrefix",
    ]);
    expect(NOTIFICATION_PARAMS["access.aipGranted"]).toEqual([]);
  });
});

describe("paths", () => {
  test("list, unread, read-all and per-row read", () => {
    expect(notificationsListPath()).toBe("/api/v1/notifications?limit=20");
    expect(notificationsListPath("c=1")).toBe(
      "/api/v1/notifications?before=c%3D1&limit=20",
    );
    expect(NOTIFICATIONS_UNREAD_PATH).toBe("/api/v1/notifications/unread");
    expect(NOTIFICATIONS_READ_ALL_PATH).toBe("/api/v1/notifications/read-all");
    expect(notificationReadPath("member", 41)).toBe(
      "/api/v1/notifications/member/41",
    );
    expect(notificationReadPath("broadcast", 7)).toBe(
      "/api/v1/notifications/broadcast/7",
    );
  });
});

describe("notificationHref", () => {
  test("same site links by path", () => {
    expect(notificationHref({ site: "web", path: "/pilots" }, "web")).toBe(
      "/pilots",
    );
  });

  test("other sites link by full origin", () => {
    expect(
      notificationHref({ site: "web", path: "/pilots" }, "controller"),
    ).toBe("https://ceruleanavi.net/pilots");
    expect(
      notificationHref({ site: "controller", path: "/reservations" }, "web"),
    ).toBe("https://controller.ceruleanavi.net/reservations");
  });

  test("origins override the registry", () => {
    expect(
      notificationHref({ site: "web", path: "/pilots" }, "exam", {
        web: "http://localhost:4321",
      }),
    ).toBe("http://localhost:4321/pilots");
  });

  test("an unknown site has no link", () => {
    expect(notificationHref({ site: "nowhere", path: "/" }, "web")).toBeNull();
    expect(notificationHref({ site: "toString", path: "/" }, "web")).toBeNull();
  });

  test("a path that is not site-relative becomes /", () => {
    for (const path of [
      "//evil.example",
      "https://evil.example",
      "/\\evil",
      "",
    ]) {
      expect(notificationHref({ site: "web", path }, "web")).toBe("/");
    }
  });
});

describe("notificationIcon", () => {
  test("by category", () => {
    expect(notificationIcon("promotion.approved")).toBe("star");
    expect(notificationIcon("exam.failed")).toBe("academicCap");
    expect(notificationIcon("security.newSignIn")).toBe("shieldCheck");
  });

  test("unknown categories get the bell", () => {
    expect(notificationIcon("future.kind")).toBe("bell");
    expect(notificationIcon("constructor.x")).toBe("bell");
  });

  test("every kind's icon exists", () => {
    for (const kind of NOTIFICATION_KINDS) {
      expect(ICON_NAMES).toContain(notificationIcon(kind));
    }
  });
});

describe("notificationBadgeText", () => {
  test("none at 0, the number up to 98, 99+ from 99", () => {
    expect(notificationBadgeText(0)).toBe("");
    expect(notificationBadgeText(-1)).toBe("");
    expect(notificationBadgeText(1)).toBe("1");
    expect(notificationBadgeText(98)).toBe("98");
    expect(notificationBadgeText(99)).toBe("99+");
    expect(notificationBadgeText(150)).toBe("99+");
  });
});

describe("notificationTime", () => {
  const now = Date.parse("2026-09-30T12:00:00Z");
  const ago = (seconds: number) => new Date(now - seconds * 1000).toISOString();

  test("relative within a week", () => {
    expect(notificationTime(ago(30), now, "en-us")).toBe("now");
    expect(notificationTime(ago(5 * 60), now, "en-us")).toBe("5 minutes ago");
    expect(notificationTime(ago(3 * 3600), now, "en-us")).toBe("3 hours ago");
    expect(notificationTime(ago(30 * 3600), now, "en-us")).toBe("yesterday");
  });

  test("a date after a week", () => {
    const then = now - 10 * 86400 * 1000;
    expect(notificationTime(new Date(then).toISOString(), now, "en-us")).toBe(
      new Intl.DateTimeFormat("en-us", {
        month: "short",
        day: "numeric",
      }).format(then),
    );
  });

  test("an unknown locale reads as zh-cn; a bad date is empty", () => {
    expect(notificationTime(ago(5 * 60), now, "fr-fr")).toBe(
      new Intl.RelativeTimeFormat("zh-cn", { numeric: "auto" }).format(
        -5,
        "minute",
      ),
    );
    expect(notificationTime("not a date", now, "en-us")).toBe("");
  });
});

describe("ratingShort", () => {
  test("codes by id; unknown ids as the number", () => {
    expect(ratingShort(1)).toBe("OBS");
    expect(ratingShort(3)).toBe("S2");
    expect(ratingShort(11)).toBe("SUP");
    expect(ratingShort(42)).toBe("42");
  });
});
