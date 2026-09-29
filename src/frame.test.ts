import { describe, expect, test } from "bun:test";
import { frameLinks, noAccessText, railTabs, reachableSites } from "./frame";
import { CHROME_MESSAGES, createTranslator } from "./i18n";
import type { NavItem } from "./nav";

const nav: NavItem[] = [
  { name: "总览", href: "/", icon: "home" },
  { name: "占位", href: "#", icon: "home" },
  { name: "章节", href: "#section", icon: "bookOpen" },
  {
    name: "飞行",
    icon: "paperAirplane",
    children: [
      { name: "计划", href: "/flightplan" },
      { name: "航路", href: "/route", icon: "map" },
    ],
  },
  { name: "名册", href: "https://ceruleanavi.net/roster", icon: "users" },
];

describe("frameLinks", () => {
  test("flattens groups, children inherit the group icon", () => {
    expect(frameLinks(nav)).toEqual([
      { name: "总览", href: "/", icon: "home" },
      { name: "章节", href: "#section", icon: "bookOpen" },
      { name: "计划", href: "/flightplan", icon: "paperAirplane" },
      { name: "航路", href: "/route", icon: "map" },
    ]);
  });

  test("external links only when asked", () => {
    expect(frameLinks(nav, { external: true }).map((l) => l.href)).toContain(
      "https://ceruleanavi.net/roster",
    );
  });
});

describe("noAccessText", () => {
  test("rating and permission", () => {
    expect(noAccessText({ kind: "rating", required: 8 })).toEqual({
      key: "noAccess.rating",
      values: { required: 8 },
    });
    expect(noAccessText({ kind: "permission", name: "aipAccess" })).toEqual({
      key: "noAccess.permission",
      values: { name: "aipAccess" },
    });
  });
});

test("every key the frame renders has an English default", () => {
  const t = createTranslator(CHROME_MESSAGES);
  const keys = [
    "openMenu",
    "siteNavigation",
    "signingOut",
    "signOutFailed",
    "rail.collapse",
    "rail.expand",
    "rail.me",
    "noAccess.title",
    "noAccess.rating",
    "noAccess.permission",
    "noAccess.signedInAs",
    "noAccess.reachable",
  ];
  for (const key of keys) expect(t(key)).not.toBe(key);
});

describe("reachableSites", () => {
  test("signed in, current site dropped, floors applied", () => {
    const keys = reachableSites({
      current: "portal",
      locale: "zh-cn",
      rating: 8,
    }).map((s) => s.key);
    expect(keys).not.toContain("portal");
    expect(keys).toContain("efb");
    expect(keys).not.toContain("database");
  });

  test("origins reach the links", () => {
    const efb = reachableSites({
      current: "database",
      locale: "en-us",
      origins: { efb: "http://localhost:4324" },
    }).find((s) => s.key === "efb");
    expect(efb?.href).toBe("http://localhost:4324/");
  });
});

describe("railTabs", () => {
  const a: NavItem = { name: "A", href: "/a", icon: "home" };
  const b: NavItem = { name: "B", href: "/b", icon: "home" };
  const c: NavItem = { name: "C", href: "/c", icon: "home" };
  const d: NavItem = { name: "D", href: "/d", icon: "home" };
  const e: NavItem = { name: "E", href: "/e", icon: "home" };
  const external: NavItem = {
    name: "X",
    href: "https://x.example/",
    icon: "users",
  };
  const hash: NavItem = { name: "H", href: "#", icon: "home" };
  const link = (item: NavItem) => ({
    name: item.name,
    href: item.href ?? "",
    icon: item.icon,
  });

  test("none flagged: the first three internal leaves", () => {
    const { tabs, overflow } = railTabs([a, external, b, hash, c, d]);
    expect(tabs).toEqual([link(a), link(b), link(c)]);
    expect(overflow).toEqual([link(external), link(d)]);
  });

  test("flagged leaves win, in nav order, at most three", () => {
    const { tabs, overflow } = railTabs([
      a,
      { ...b, phoneTab: true },
      { ...c, phoneTab: true },
      { ...d, phoneTab: true },
      { ...e, phoneTab: true },
    ]);
    expect(tabs).toEqual([link(b), link(c), link(d)]);
    expect(overflow).toEqual([link(a), link(e)]);
  });

  test("a grouped nav is flattened; children inherit the group icon", () => {
    const nav: NavItem[] = [
      { name: "Home", href: "/", icon: "squares2x2", phoneTab: true },
      {
        name: "Flight",
        icon: "paperAirplane",
        children: [
          { name: "Plan", href: "/flightplan", phoneTab: true },
          { name: "Route", href: "/route", icon: "map", phoneTab: true },
        ],
      },
      {
        name: "Briefing",
        icon: "buildingOffice",
        children: [{ name: "Airports", href: "/airports" }],
      },
      { name: "Settings", href: "/settings", icon: "cog6Tooth" },
    ];
    const { tabs, overflow } = railTabs(nav);
    expect(tabs).toEqual([
      { name: "Home", href: "/", icon: "squares2x2" },
      { name: "Plan", href: "/flightplan", icon: "paperAirplane" },
      { name: "Route", href: "/route", icon: "map" },
    ]);
    expect(overflow).toEqual([
      { name: "Airports", href: "/airports", icon: "buildingOffice" },
      { name: "Settings", href: "/settings", icon: "cog6Tooth" },
    ]);
  });

  test("a flagged external link is never a tab", () => {
    const { tabs, overflow } = railTabs([{ ...external, phoneTab: true }, a]);
    expect(tabs).toEqual([link(a)]);
    expect(overflow).toEqual([link(external)]);
  });

  test("an empty nav", () => {
    expect(railTabs([])).toEqual({ tabs: [], overflow: [] });
  });
});
