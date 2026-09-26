import { expect, test } from "bun:test";
import { headerNetworkSites } from "./siteHeader";

/**
 * The header's network list is drawn twice — the desktop `NetworkMenu` and the
 * mobile drawer — and only the drawer goes through this function. If `rating`
 * stopped reaching `visibleSites` here, the drawer would quietly drop the
 * portal for every instructor on a phone while the desktop menu kept it.
 */

const base = { current: "web" as const, locale: "zh-cn", signedIn: true };
const keys = (rating?: number) =>
  headerNetworkSites({ ...base, rating }).map((site) => site.key);

test("rating reaches visibleSites: the portal appears from 8", () => {
  expect(keys(undefined)).not.toContain("portal");
  expect(keys(7)).not.toContain("portal");
  expect(keys(8)).toContain("portal");
});

test("rating reaches visibleSites: the data console appears at 12", () => {
  expect(keys(8)).not.toContain("database");
  expect(keys(12)).toContain("database");
});

test("the current site is never in its own list", () => {
  expect(keys(12)).not.toContain("web");
});

test("signed out sees only the public sites", () => {
  const signedOut = headerNetworkSites({
    current: "web",
    locale: "zh-cn",
    signedIn: false,
    rating: 12,
  }).map((site) => site.key);
  expect(signedOut).toEqual(["radar", "docs", "dev"]);
});

/**
 * `origins` reaching `visibleSites` from here is what a dev box needs: the
 * drawer must link to another site's own dev origin instead of production,
 * without touching which sites show. `current` is `efb` rather than `web` so
 * the overridden entry itself is not the one excluded by `excludeCurrent`.
 */
test("origins overrides one site's link and leaves the rest on production", () => {
  const withOverride = headerNetworkSites({
    current: "efb",
    locale: "zh-cn",
    signedIn: true,
    rating: 12,
    origins: { web: "http://localhost:4321" },
  });
  const web = withOverride.find((site) => site.key === "web");
  const radar = withOverride.find((site) => site.key === "radar");
  expect(web?.href).toBe("http://localhost:4321/");
  expect(radar?.href).toBe("https://radar.ceruleanavi.net/");
});

test("without origins, hrefs are unchanged", () => {
  const withoutOverride = headerNetworkSites({
    current: "efb",
    locale: "zh-cn",
    signedIn: true,
    rating: 12,
  });
  const web = withoutOverride.find((site) => site.key === "web");
  expect(web?.href).toBe("https://ceruleanavi.net/");
});
