import { describe, expect, test } from "bun:test";
import { LOCALES } from "./i18n";
import {
  NOTIFICATION_MESSAGES,
  NOTIFICATION_UI,
  notificationChrome,
  notificationLocale,
  renderNotification,
} from "./notificationMessages";
import { NOTIFICATION_KINDS, NOTIFICATION_PARAMS } from "./notifications";

const PLACEHOLDER = /\{(\w+)\}/g;

describe("kind completeness", () => {
  test("every kind has a non-empty message in every locale", () => {
    for (const locale of LOCALES) {
      for (const kind of NOTIFICATION_KINDS) {
        const message = NOTIFICATION_MESSAGES[locale]?.[kind];
        expect({
          locale,
          kind,
          ok: typeof message === "string" && message.trim().length > 0,
        }).toEqual({ locale, kind, ok: true });
      }
    }
  });

  test("no locale carries a kind that is not in NOTIFICATION_KINDS", () => {
    for (const locale of LOCALES) {
      expect(Object.keys(NOTIFICATION_MESSAGES[locale]).sort()).toEqual(
        [...NOTIFICATION_KINDS].sort(),
      );
    }
    expect(Object.keys(NOTIFICATION_MESSAGES).sort()).toEqual(
      [...LOCALES].sort(),
    );
  });

  test("placeholders name only the kind's params", () => {
    for (const locale of LOCALES) {
      for (const kind of NOTIFICATION_KINDS) {
        const used = [
          ...NOTIFICATION_MESSAGES[locale][kind].matchAll(PLACEHOLDER),
        ].map((match) => match[1]);
        for (const name of used) {
          expect({
            locale,
            kind,
            name,
            allowed: NOTIFICATION_PARAMS[kind].includes(name!),
          }).toEqual({ locale, kind, name, allowed: true });
        }
      }
    }
  });

  test("every optional segment holds a placeholder", () => {
    for (const locale of LOCALES) {
      for (const kind of NOTIFICATION_KINDS) {
        for (const match of NOTIFICATION_MESSAGES[locale][kind].matchAll(
          /\[([^[\]]*)\]/g,
        )) {
          expect(match[1]).toMatch(/\{\w+\}/);
        }
      }
    }
  });

  test("the bell's own strings exist in every locale", () => {
    const keys = Object.keys(NOTIFICATION_UI["zh-cn"]).sort();
    for (const locale of LOCALES) {
      expect(Object.keys(NOTIFICATION_UI[locale]).sort()).toEqual(keys);
      for (const key of keys) {
        const value =
          NOTIFICATION_UI[locale][
            key as keyof (typeof NOTIFICATION_UI)["zh-cn"]
          ];
        expect(value.length).toBeGreaterThan(0);
      }
      expect(NOTIFICATION_UI[locale].labelCount).toContain("{count}");
      expect(NOTIFICATION_UI[locale].announce).toContain("{count}");
    }
  });
});

describe("renderNotification", () => {
  test("ratings render as codes", () => {
    expect(
      renderNotification(
        { kind: "rating.changed", params: { fromRating: 2, toRating: 3 } },
        "en-us",
      ),
    ).toBe("Your rating changed from S1 to S2");
  });

  test("an optional comment appears only when present", () => {
    const base = { kind: "promotion.approved", params: { toRating: 3 } };
    expect(renderNotification(base, "zh-cn")).toBe("你的 S2 晋升申请已通过");
    expect(
      renderNotification(
        { ...base, params: { toRating: 3, comment: "欢迎加入塔台" } },
        "zh-cn",
      ),
    ).toBe("你的 S2 晋升申请已通过：欢迎加入塔台");
    expect(
      renderNotification(
        { ...base, params: { toRating: 3, comment: "" } },
        "zh-cn",
      ),
    ).toBe("你的 S2 晋升申请已通过");
  });

  test("redemption.cancelled adds the refund only when points is present", () => {
    expect(
      renderNotification(
        { kind: "redemption.cancelled", params: { prize: "限定徽章" } },
        "zh-cn",
      ),
    ).toBe("你兑换的限定徽章已取消");
    expect(
      renderNotification(
        {
          kind: "redemption.cancelled",
          params: { prize: "限定徽章", points: 200 },
        },
        "zh-cn",
      ),
    ).toBe("你兑换的限定徽章已取消，200 积分已退回");
    for (const locale of LOCALES) {
      expect(
        renderNotification(
          { kind: "redemption.cancelled", params: { prize: "限定徽章" } },
          locale,
        ),
      ).not.toContain("{points}");
    }
  });

  test("promoted adds a clause only when true", () => {
    const item = (promoted: boolean) => ({
      kind: "exam.passed",
      params: { paper: "S2 理论", score: 92, promoted },
    });
    expect(renderNotification(item(true), "zh-cn")).toBe(
      "你通过了「S2 理论」，得分 92，等级已晋升",
    );
    expect(renderNotification(item(false), "zh-cn")).toBe(
      "你通过了「S2 理论」，得分 92",
    );
  });

  test("startsAt renders as a local date and time", () => {
    const startsAt = "2026-10-01T12:00:00Z";
    const expected = new Intl.DateTimeFormat("zh-cn", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "UTC",
    }).format(Date.parse(startsAt));
    expect(
      renderNotification(
        {
          kind: "activity.published",
          params: { activityId: 12, title: "国庆联飞", startsAt },
        },
        "zh-cn",
        undefined,
        { timeZone: "UTC" },
      ),
    ).toBe(`新活动「国庆联飞」已发布，${expected} 开始`);
  });

  test("month renders as a month name", () => {
    expect(
      renderNotification(
        {
          kind: "leaderboard.credited",
          params: { month: "2026-09", points: 50 },
        },
        "en-us",
      ),
    ).toBe("Leaderboard reward for September 2026: 50 points");
  });

  test("an invalid month renders as given and does not throw", () => {
    for (const month of ["2026-13", "2026-00"]) {
      expect(
        renderNotification(
          { kind: "leaderboard.credited", params: { month, points: 50 } },
          "en-us",
        ),
      ).toBe(`Leaderboard reward for ${month}: 50 points`);
    }
  });

  test("placeholders read own params only", () => {
    expect(
      renderNotification(
        { kind: "oauth.revoked", params: { app: "SimBrief" } },
        "zh-cn",
        { "oauth.revoked": "{constructor} {app}" },
      ),
    ).toBe("{constructor} SimBrief");
    expect(
      renderNotification(
        { kind: "oauth.revoked", params: { app: "SimBrief" } },
        "zh-cn",
        { "oauth.revoked": "[{toString}]{app}" },
      ),
    ).toBe("SimBrief");
  });

  test("Chinese templates put no space around Chinese-valued placeholders", () => {
    for (const locale of ["zh-cn", "zh-tw"] as const) {
      for (const kind of NOTIFICATION_KINDS) {
        const message = NOTIFICATION_MESSAGES[locale][kind];
        expect(message).not.toMatch(/ \{(prize|position|title|app|paper)\}/);
        expect(message).not.toMatch(/\{(prize|position|title|app|paper)\} /);
      }
    }
  });

  test("an unknown locale falls back to zh-cn", () => {
    expect(
      renderNotification({ kind: "access.aipGranted", params: {} }, "fr-fr"),
    ).toBe("你已获得航行资料库访问权限");
    expect(notificationLocale("fr-fr")).toBe("zh-cn");
    expect(notificationLocale("ja-jp")).toBe("ja-jp");
  });

  test("an unknown kind renders the generic line", () => {
    expect(
      renderNotification({ kind: "future.kind", params: {} }, "en-us"),
    ).toBe("You have a new notification");
    expect(
      renderNotification({ kind: "future.kind", params: {} }, "zh-cn"),
    ).toBe("你有一条新通知");
    expect(renderNotification({ kind: "toString", params: {} }, "zh-cn")).toBe(
      "你有一条新通知",
    );
  });

  test("overrides win", () => {
    expect(
      renderNotification(
        { kind: "oauth.revoked", params: { app: "SimBrief" } },
        "zh-cn",
        { "oauth.revoked": "已撤销 {app}" },
      ),
    ).toBe("已撤销 SimBrief");
  });

  test("a missing required param stays visible; bad params do not throw", () => {
    expect(
      renderNotification({ kind: "activity.cancelled", params: {} }, "zh-cn"),
    ).toBe("你报名的活动「{title}」已取消");
    expect(
      renderNotification(
        {
          kind: "access.developerGranted",
          params: null as unknown as Record<string, unknown>,
        },
        "zh-cn",
      ),
    ).toBe("你已获得开发者权限");
  });
});

describe("notificationChrome", () => {
  test("namespaces the locale's bell strings under notifications", () => {
    expect(notificationChrome("en-us").notifications.title).toBe(
      "Notifications",
    );
    expect(notificationChrome("xx").notifications.title).toBe("通知");
  });
});
