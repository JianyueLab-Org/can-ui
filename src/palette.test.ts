import { describe, expect, test } from "bun:test";
import {
  commandTier,
  filterCommands,
  framePaletteItems,
  navCommandItems,
  networkPageItems,
  pageKeywords,
  pageTitle,
  pageVisible,
  type CommandItem,
} from "./palette";
import type { NetworkPage } from "./sites";

const page: NetworkPage = {
  key: "demo",
  path: "/demo",
  icon: "home",
  title: {
    "zh-cn": "演示",
    "zh-tw": "演示頁",
    "en-us": "Demo",
    "ja-jp": "デモ",
  },
  keywords: ["sample"],
};

describe("pageVisible", () => {
  test("a public page shows to everybody", () => {
    expect(pageVisible(page, false)).toBe(true);
  });

  test("a signed-in page hides when signed out", () => {
    const gated = { ...page, signedIn: true };
    expect(pageVisible(gated, false)).toBe(false);
    expect(pageVisible(gated, true)).toBe(true);
  });

  test("a missing rating hides a floored page", () => {
    expect(
      pageVisible({ ...page, signedIn: true, minRating: 8 }, true, undefined),
    ).toBe(false);
  });

  test("the floor is inclusive", () => {
    const gated = { ...page, signedIn: true, minRating: 11 };
    expect(pageVisible(gated, true, 10)).toBe(false);
    expect(pageVisible(gated, true, 11)).toBe(true);
  });

  test("a floored page never shows signed out", () => {
    expect(pageVisible({ ...page, minRating: 1 }, false, 12)).toBe(false);
  });
});

describe("pageTitle and pageKeywords", () => {
  test("title in the locale, English for an unknown one", () => {
    expect(pageTitle(page, "ja-jp")).toBe("デモ");
    expect(pageTitle(page, "de-de")).toBe("Demo");
  });

  test("keywords are the other three titles, then the page's own", () => {
    expect(pageKeywords(page, "zh-cn")).toEqual([
      "演示頁",
      "Demo",
      "デモ",
      "sample",
    ]);
  });
});

describe("networkPageItems", () => {
  test("signed out on the main site: public sites' public pages", () => {
    const keys = networkPageItems({
      current: "web",
      locale: "zh-cn",
      signedIn: false,
    }).map((item) => item.key);
    expect(keys).toEqual([
      "radar:radar",
      "docs:regulations",
      "docs:atcGuidelines",
      "docs:revisions",
      "docs:history",
      "docs:privacy",
      "dev:groundMaps",
    ]);
  });

  test("the current site's pages are left to its own nav", () => {
    const items = networkPageItems({
      current: "efb",
      locale: "zh-cn",
      signedIn: true,
      rating: 5,
    });
    expect(items.some((item) => item.key?.startsWith("efb:"))).toBe(false);
  });

  test("rating 11 reaches portal SUP pages, not ADM ones", () => {
    const keys = networkPageItems({
      current: "controller",
      locale: "zh-cn",
      signedIn: true,
      rating: 11,
    }).map((item) => item.key);
    expect(keys).toContain("portal:roster");
    expect(keys).toContain("portal:promotionApproval");
    expect(keys).not.toContain("portal:aipAccess");
    expect(keys.some((key) => key?.startsWith("database:"))).toBe(false);
  });

  test("rating 5 gets no portal page and no question bank", () => {
    const keys = networkPageItems({
      current: "web",
      locale: "zh-cn",
      signedIn: true,
      rating: 5,
    }).map((item) => item.key);
    expect(keys.some((key) => key?.startsWith("portal:"))).toBe(false);
    expect(keys).toContain("exam:examCentre");
    expect(keys).not.toContain("exam:questionBank");
  });

  test("hrefs are absolute, and origins override them", () => {
    const items = networkPageItems({
      current: "web",
      locale: "en-us",
      signedIn: false,
      origins: { radar: "http://localhost:4323/" },
    });
    expect(items.find((i) => i.key === "radar:radar")?.href).toBe(
      "http://localhost:4323/",
    );
    expect(items.find((i) => i.key === "docs:privacy")?.href).toBe(
      "https://docs.ceruleanavi.net/zh_CN/privacy",
    );
  });

  test("items carry the locale's title and the site's name as group", () => {
    const radar = networkPageItems({
      current: "web",
      locale: "en-us",
      signedIn: false,
    }).find((i) => i.key === "radar:radar");
    expect(radar?.name).toBe("Radar");
    expect(radar?.group).toBe("Live Radar");
    expect(radar?.keywords).toContain("在线地图");
  });
});

describe("filterCommands", () => {
  const items: CommandItem[] = [
    {
      key: "a",
      name: "飞行计划",
      href: "/plan",
      icon: "paperAirplane",
      group: "电子飞行包",
      keywords: ["Flight plan", "fpl"],
    },
    {
      key: "b",
      name: "航路",
      href: "/route",
      icon: "map",
      group: "电子飞行包",
      keywords: ["Route"],
    },
    {
      key: "c",
      name: "Flight log",
      href: "https://x.example/log",
      icon: "clock",
      group: "主站",
    },
  ];
  const keys = (list: CommandItem[]) => list.map((item) => item.key);

  test("an empty query lists everything in order", () => {
    expect(keys(filterCommands(items, "  "))).toEqual(["a", "b", "c"]);
  });

  test("a name match outranks a keyword match", () => {
    expect(keys(filterCommands(items, "flight"))).toEqual(["c", "a"]);
  });

  test("another locale's title finds the page", () => {
    expect(keys(filterCommands(items, "Flight plan"))).toEqual(["a"]);
  });

  test("a site name finds its pages", () => {
    expect(keys(filterCommands(items, "电子飞行包"))).toEqual(["a", "b"]);
  });

  test("matching is case-insensitive", () => {
    expect(keys(filterCommands(items, "FPL"))).toEqual(["a"]);
  });

  test("groups stay together", () => {
    const mixed: CommandItem[] = [
      { key: "x1", name: "Alpha", href: "/1", icon: "home", group: "X" },
      { key: "y1", name: "Alpha", href: "/2", icon: "home", group: "Y" },
      { key: "x2", name: "Alpha", href: "/3", icon: "home", group: "X" },
    ];
    expect(keys(filterCommands(mixed, "alpha"))).toEqual(["x1", "x2", "y1"]);
  });

  test("commandTier", () => {
    expect(commandTier(items[0], "飞行")).toBe(0);
    expect(commandTier(items[0], "fpl")).toBe(1);
    expect(commandTier(items[0], "radar")).toBeNull();
  });
});

describe("navCommandItems", () => {
  test("flattens sections and skips placeholder links", () => {
    const list = navCommandItems({
      navigation: [
        { name: "总览", href: "/", icon: "home" },
        { name: "占位", href: "#", icon: "home" },
        {
          name: "训练",
          icon: "academicCap",
          children: [{ name: "大纲", href: "/syllabus" }],
        },
      ],
      workspaces: [
        {
          key: "pilots",
          name: "机组",
          href: "/pilots/",
          icon: "paperAirplane",
        },
      ],
      secondary: { label: "常用", items: [{ name: "名册", href: "/roster" }] },
      workspaceLabel: "分区",
      group: "主站",
    });
    expect(list).toEqual([
      {
        name: "机组",
        href: "/pilots/",
        icon: "paperAirplane",
        section: "分区",
        group: "主站",
      },
      { name: "总览", href: "/", icon: "home", group: "主站" },
      {
        name: "大纲",
        href: "/syllabus",
        icon: "academicCap",
        section: "训练",
        group: "主站",
      },
      {
        name: "名册",
        href: "/roster",
        icon: "arrowPath",
        section: "常用",
        group: "主站",
      },
    ]);
  });
});

describe("framePaletteItems", () => {
  test("own nav first, grouped under the site, then other sites", () => {
    const list = framePaletteItems({
      current: "web",
      locale: "zh-cn",
      signedIn: false,
      navigation: [{ name: "排行榜", href: "/leaderboard", icon: "chartBar" }],
      workspaceLabel: "分区",
    });
    expect(list[0]).toEqual({
      name: "排行榜",
      href: "/leaderboard",
      icon: "chartBar",
      group: "主站",
    });
    expect(list[1]?.key).toBe("radar:radar");
  });

  test("an href already in the own nav is not listed twice", () => {
    const list = framePaletteItems({
      current: "web",
      locale: "zh-cn",
      signedIn: false,
      navigation: [
        {
          name: "雷达",
          href: "https://radar.ceruleanavi.net/",
          icon: "mapPin",
        },
      ],
      workspaceLabel: "分区",
    });
    expect(
      list.filter((item) => item.href === "https://radar.ceruleanavi.net/"),
    ).toHaveLength(1);
    expect(list.some((item) => item.key === "radar:radar")).toBe(false);
  });
});

describe("trailing-slash paths", () => {
  test("a trailing-slash own-nav href is kept as written and deduped exactly", () => {
    const list = framePaletteItems({
      current: "web",
      locale: "zh-cn",
      signedIn: false,
      navigation: [{ name: "机组", href: "/pilots/", icon: "paperAirplane" }],
      workspaces: [
        {
          key: "pilots",
          name: "机组",
          href: "/pilots/",
          icon: "paperAirplane",
        },
      ],
      workspaceLabel: "分区",
    });
    expect(list.filter((item) => item.href === "/pilots/")).toHaveLength(1);
  });
});
