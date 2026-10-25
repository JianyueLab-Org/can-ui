import { describe, expect, test } from "bun:test";
import { SITE_PAGES } from "./sitePages";
import { NETWORK_SITES, RATING_SUP, SITE_BY_KEY } from "./sites";
import { LOCALES } from "./i18n";
import { ICON_NAMES } from "./icons";

/**
 * The ⌘K registry. A blank title renders as nothing, a bad icon draws
 * nothing, and a wrong path links to a 404 on another host. None throw.
 */
describe("SITE_PAGES", () => {
  test("every site carries its own list", () => {
    for (const site of NETWORK_SITES) {
      expect(site.pages).toBe(SITE_PAGES[site.key]);
      expect(site.pages.length).toBeGreaterThan(0);
    }
  });

  test("every page has a title in all four locales", () => {
    for (const site of NETWORK_SITES) {
      for (const page of site.pages) {
        for (const locale of LOCALES) {
          expect(page.title[locale]?.trim().length).toBeGreaterThan(0);
        }
      }
    }
  });

  test("every icon names a real path", () => {
    for (const site of NETWORK_SITES) {
      for (const page of site.pages) expect(ICON_NAMES).toContain(page.icon);
    }
  });

  test("keys are unique within a site", () => {
    for (const site of NETWORK_SITES) {
      const keys = site.pages.map((p) => p.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  test("paths are site-relative, with no query or hash", () => {
    for (const site of NETWORK_SITES) {
      for (const page of site.pages) {
        expect(page.path.startsWith("/")).toBe(true);
        expect(page.path.startsWith("//")).toBe(false);
        expect(page.path).not.toMatch(/[?#]/);
      }
    }
  });

  test("a rating floor implies signed in", () => {
    for (const site of NETWORK_SITES) {
      for (const page of site.pages) {
        if (page.minRating !== undefined) expect(page.signedIn).toBe(true);
      }
    }
  });

  test("a page floor is never below its site's", () => {
    for (const site of NETWORK_SITES) {
      for (const page of site.pages) {
        if (page.minRating !== undefined && site.minRating !== undefined) {
          expect(page.minRating).toBeGreaterThanOrEqual(site.minRating);
        }
      }
    }
  });

  test("portal's SUP pages use the named floor", () => {
    const approval = SITE_BY_KEY.portal.pages.find(
      (p) => p.key === "promotionApproval",
    );
    expect(approval?.minRating).toBe(RATING_SUP);
  });

  test("the virtual airline pages and their staff page are listed", () => {
    expect(SITE_PAGES.va.map((p) => p.path)).toEqual([
      "/",
      "/airlines",
      "/apply",
      "/notifications",
    ]);
    const manage = SITE_BY_KEY.portal.pages.find(
      (p) => p.path === "/super/airlines",
    );
    expect(manage?.minRating).toBe(RATING_SUP);
    expect(manage?.signedIn).toBe(true);
  });
});

describe("SITE_PAGES.web", () => {
  const byKey = new Map(SITE_PAGES.web.map((page) => [page.key, page]));

  test("account pages live under /account", () => {
    expect(byKey.get("account")?.path).toBe("/account");
    expect(byKey.get("authorizedApps")?.path).toBe("/account/apps");
    expect(byKey.get("botBindings")?.path).toBe("/account/bots");
  });

  test("nothing points at the old /pilots account paths", () => {
    const paths = SITE_PAGES.web.map((page) => page.path);
    for (const old of [
      "/pilots/account",
      "/pilots/apps",
      "/pilots/bot-bindings",
    ]) {
      expect(paths).not.toContain(old);
    }
  });

  test("statistics and feedback are listed and need sign-in", () => {
    expect(byKey.get("statistics")?.path).toBe("/pilots/status");
    expect(byKey.get("statistics")?.signedIn).toBe(true);
    expect(byKey.get("feedback")?.path).toBe("/feedback");
    expect(byKey.get("feedback")?.signedIn).toBe(true);
  });

  test("roster needs sign-in", () => {
    expect(byKey.get("roster")?.signedIn).toBe(true);
  });
});

describe("spec nav order", () => {
  const paths = (key: keyof typeof SITE_PAGES) =>
    SITE_PAGES[key].map((page) => page.path);

  test("efb lists its five nav items, settings last", () => {
    expect(paths("efb")).toEqual([
      "/",
      "/flightplan",
      "/route",
      "/airports",
      "/settings",
    ]);
  });

  test("controller lists reservations before rules", () => {
    expect(paths("controller")).toEqual([
      "/",
      "/atis",
      "/reservations",
      "/rules",
    ]);
  });

  test("exam lists training after the exam centre", () => {
    expect(paths("exam")).toEqual(["/", "/training", "/admin"]);
  });

  test("portal lists points adjustment between lottery and feedback", () => {
    const keys = SITE_PAGES.portal.map((page) => page.key);
    const at = keys.indexOf("pointsManage");
    expect(keys[at - 1]).toBe("lotteryManage");
    expect(keys[at + 1]).toBe("feedbackManage");
    expect(SITE_PAGES.portal[at]?.minRating).toBe(RATING_SUP);
  });
});
