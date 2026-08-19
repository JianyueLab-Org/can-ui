import { expect, test } from "bun:test";
import {
  COMMUNITY_LINKS,
  NETWORK_SITES,
  SITE_LABELS,
  communityLinks,
  sectionHeadings,
  siteLabels,
  siteUrl,
  sitesBySection,
  visibleSites,
  type SiteKey,
} from "./sites";
import { LANGUAGES } from "./i18n";
import { ICON_NAMES } from "./icons";

/**
 * This registry is what nine hosts agree about. Nothing here throws when it is
 * wrong — a missing label renders as `undefined`, a bad icon renders as
 * nothing, a link a member cannot follow renders as a link. So these are the
 * checks.
 */

const KEYS = NETWORK_SITES.map((s) => s.key);

test("every locale the network ships has a label for every site", () => {
  for (const { code } of LANGUAGES) {
    const table = SITE_LABELS[code];
    expect(table).toBeDefined();
    for (const key of KEYS) {
      expect(table[key]?.name?.length).toBeGreaterThan(0);
      expect(table[key]?.tagline?.length).toBeGreaterThan(0);
    }
  }
});

test("an unknown locale falls back to English rather than blank", () => {
  expect(siteLabels("de-de")).toBe(siteLabels("en-us"));
  expect(siteLabels("de-de").radar.name).toBe("Live Radar");
});

test("every icon names a real path, so no entry draws empty", () => {
  for (const site of NETWORK_SITES) {
    expect(ICON_NAMES).toContain(site.icon);
  }
});

test("keys are unique and origins are distinct hosts", () => {
  expect(new Set(KEYS).size).toBe(KEYS.length);
  const origins = NETWORK_SITES.map((s) => s.origin);
  expect(new Set(origins).size).toBe(origins.length);
});

/**
 * The origins are also can-web's open-redirect allow-list, keyed by exact
 * origin match. A trailing slash or an http:// scheme here would be a silently
 * rejected callbackUrl on the other side.
 */
test("origins are https and carry no trailing slash", () => {
  for (const site of NETWORK_SITES) {
    expect(site.origin.startsWith("https://")).toBe(true);
    expect(site.origin.endsWith("/")).toBe(false);
    expect(site.path.startsWith("/")).toBe(true);
  }
});

test("siteUrl joins origin and path, and takes an override", () => {
  expect(siteUrl("radar")).toBe("https://radar.ceruleanavi.net/");
  expect(siteUrl("docs", "/zh_CN/atc")).toBe(
    "https://docs.ceruleanavi.net/zh_CN/atc",
  );
});

/**
 * 每一条**公开**的落点都必须是那个站上不需要登录的地址。
 *
 * 这条测试是因为 `dev` 曾经指着 `/docs` 而写的：接口文档后来加了登录门槛，于是
 * 那一条 `publicSite: true` 的菜单项对每一个未登录访客都是一堵登录墙 —— 恰恰是
 * `minRating` 存在要避免的那种链接。断言写成「公开站点一律落在自己的首页」，因
 * 为一个站的首页是它唯一能保证不设防的地址；要指某个子路径，就得先回答那一页是
 * 不是也公开，而那个问题正是上一次答错的。
 */
test("public entries land on a page that needs no session", () => {
  for (const site of NETWORK_SITES) {
    if (!site.publicSite) continue;
    expect(site.path).toBe("/");
  }
});

/* ------------------------------------------------------------------ *
 * Visibility. The rule is "a menu never offers a link that will 403",
 * and the direction of failure matters more than the rule.
 * ------------------------------------------------------------------ */

const keysOf = (sites: { key: SiteKey }[]) => sites.map((s) => s.key);

test("signed out sees only the public sites", () => {
  const keys = keysOf(visibleSites({ locale: "zh-cn" }));
  expect(keys).toEqual(["radar", "web", "docs", "dev"]);
});

test("a plain member sees everything except the gated two", () => {
  const keys = keysOf(
    visibleSites({ locale: "zh-cn", signedIn: true, rating: 3 }),
  );
  expect(keys).toContain("web");
  expect(keys).toContain("efb");
  expect(keys).toContain("exam");
  expect(keys).not.toContain("portal");
  expect(keys).not.toContain("database");
});

test("an instructor sees the portal; only ADM sees the data console", () => {
  const instructor = keysOf(
    visibleSites({ locale: "zh-cn", signedIn: true, rating: 8 }),
  );
  expect(instructor).toContain("portal");
  expect(instructor).not.toContain("database");

  const adm = keysOf(
    visibleSites({ locale: "zh-cn", signedIn: true, rating: 12 }),
  );
  expect(adm).toContain("portal");
  expect(adm).toContain("database");
});

/**
 * The one that would go unnoticed. A session whose rating did not resolve must
 * see *fewer* entries, not more — `undefined >= 8` is false by luck, and this
 * pins the intent so a refactor to `rating! >= n` fails here instead of in
 * production.
 */
test("a signed-in member with no rating is shown less, not more", () => {
  const keys = keysOf(visibleSites({ locale: "zh-cn", signedIn: true }));
  expect(keys).not.toContain("portal");
  expect(keys).not.toContain("database");
  expect(keys).toContain("web");
});

test("the current site is marked, and dropped only when asked", () => {
  const shown = visibleSites({
    locale: "zh-cn",
    signedIn: true,
    rating: 3,
    current: "exam",
  });
  expect(shown.find((s) => s.key === "exam")?.current).toBe(true);

  const dropped = visibleSites({
    locale: "zh-cn",
    signedIn: true,
    rating: 3,
    current: "exam",
    excludeCurrent: true,
  });
  expect(keysOf(dropped)).not.toContain("exam");
});

test("sections keep declaration order and drop empty columns", () => {
  const groups = sitesBySection({
    locale: "zh-cn",
    signedIn: true,
    rating: 3,
  });
  expect(groups.map((g) => g.section)).toEqual(["flight", "atc", "network"]);
  for (const group of groups) expect(group.sites.length).toBeGreaterThan(0);

  // Signed out there is no ATC column at all — every entry in it needs a session.
  const anon = sitesBySection({ locale: "zh-cn" });
  expect(anon.map((g) => g.section)).toEqual(["flight", "network"]);
});

/**
 * The footer's headings and the menu's trigger word are here for the same
 * reason the site names are, and they fail the same way: a locale missing one
 * renders the English word next to Chinese labels, which reads as a
 * half-translated page rather than as a bug.
 */
test("every locale has every heading, including the menu's own word", () => {
  for (const { code } of LANGUAGES) {
    const h = sectionHeadings(code);
    for (const field of [
      "flight",
      "atc",
      "network",
      "community",
      "description",
      "menuLabel",
    ] as const) {
      expect(h[field]?.length).toBeGreaterThan(0);
    }
  }
});

test("community links are named in every locale and are absolute", () => {
  for (const { code } of LANGUAGES) {
    const links = communityLinks(code);
    expect(links.length).toBe(COMMUNITY_LINKS.length);
    for (const link of links) {
      expect(link.name.length).toBeGreaterThan(0);
      expect(link.href.startsWith("https://")).toBe(true);
      // The rename left `https://github.com/Cerulean Aviation Network/` in two
      // footers. A URL with a space in it is the one this pins.
      expect(link.href).not.toContain(" ");
    }
  }
});
