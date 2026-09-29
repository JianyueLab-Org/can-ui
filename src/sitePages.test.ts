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
});
