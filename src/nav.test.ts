import { describe, expect, test } from "bun:test";
import { buildWorkspaces, isCurrentPath, workspaceVisible } from "./nav";
import {
  NETWORK_SITES,
  WORKSPACE_SITE_KEYS,
  siteUrl,
  type NetworkSite,
} from "./sites";

/**
 * The switcher used to be four hand-kept copies (can-web, can-controller,
 * can-portal, can-database) and they had already disagreed: can-web sent the
 * exam centre to its own `/exams/`, the other three to exam.ceruleanavi.net.
 * A wrong href here renders, links and 404s nowhere near the code that built
 * it — so these are the checks.
 */

const t = (key: string) => `«${key}»`;

describe("buildWorkspaces", () => {
  test("three sections, fixed order, names from the site's dictionary", () => {
    const ws = buildWorkspaces(t, { current: "portal" });
    expect(ws.map((w) => w.key)).toEqual(["pilots", "controllers", "exams"]);
    expect(ws.map((w) => w.name)).toEqual([
      "«workspace.pilots»",
      "«workspace.controllers»",
      "«workspace.exams»",
    ]);
    expect(ws.map((w) => w.icon)).toEqual([
      "paperAirplane",
      "signal",
      "academicCap",
    ]);
  });

  test("the two sections off the main site are exactly WORKSPACE_SITE_KEYS", () => {
    const ws = buildWorkspaces(t, { current: "portal" });
    expect(ws.slice(1).map((w) => w.href)).toEqual(
      WORKSPACE_SITE_KEYS.map((key) => siteUrl(key, "/")),
    );
  });

  test("output per site key", () => {
    const hrefs = (current?: NetworkSite["key"]) =>
      buildWorkspaces(t, { current }).map((w) => w.href);

    expect(hrefs("web")).toEqual([
      "/pilots/",
      "https://controller.ceruleanavi.net/",
      "https://exam.ceruleanavi.net/",
    ]);
    expect(hrefs("controller")).toEqual([
      "https://ceruleanavi.net/pilots/",
      "/",
      "https://exam.ceruleanavi.net/",
    ]);
    const absolute = [
      "https://ceruleanavi.net/pilots/",
      "https://controller.ceruleanavi.net/",
      "https://exam.ceruleanavi.net/",
    ];
    expect(hrefs("portal")).toEqual(absolute);
    expect(hrefs("database")).toEqual(absolute);
    expect(hrefs(undefined)).toEqual(absolute);
  });

  test("exams is exam.ceruleanavi.net on every site but the exam centre", () => {
    for (const site of NETWORK_SITES) {
      const exams = buildWorkspaces(t, { current: site.key }).find(
        (w) => w.key === "exams",
      );
      expect(exams?.href).toBe(
        site.key === "exam" ? "/" : "https://exam.ceruleanavi.net/",
      );
    }
  });

  test("rating gating: no section site carries minRating, so none drops", () => {
    expect(buildWorkspaces(t, { current: "web" })).toHaveLength(3);
    expect(buildWorkspaces(t, { current: "web", rating: 1 })).toHaveLength(3);
  });
});

describe("workspaceVisible", () => {
  const gated: NetworkSite = {
    key: "portal",
    origin: "https://portal.ceruleanavi.net",
    path: "/",
    icon: "shieldCheck",
    section: "atc",
    minRating: 8,
  };
  const open: NetworkSite = { ...gated, minRating: undefined };

  test("a missing rating hides a gated section rather than showing it", () => {
    expect(workspaceVisible(gated, undefined)).toBe(false);
  });

  test("the floor is inclusive", () => {
    expect(workspaceVisible(gated, 7)).toBe(false);
    expect(workspaceVisible(gated, 8)).toBe(true);
  });

  test("an ungated section shows without a rating", () => {
    expect(workspaceVisible(open, undefined)).toBe(true);
  });
});

describe("isCurrentPath", () => {
  test("the root only lights on the root", () => {
    expect(isCurrentPath("/", "/")).toBe(true);
    expect(isCurrentPath("/", "/route")).toBe(false);
  });

  test("a child route lights its parent; a sibling sharing a prefix does not", () => {
    expect(isCurrentPath("/route", "/route")).toBe(true);
    expect(isCurrentPath("/route", "/route/expand")).toBe(true);
    expect(isCurrentPath("/route", "/routes")).toBe(false);
  });

  test("a trailing slash is the opt-out from prefix matching", () => {
    expect(isCurrentPath("/pilots/", "/pilots")).toBe(true);
    expect(isCurrentPath("/pilots/", "/pilots/")).toBe(true);
    expect(isCurrentPath("/pilots/", "/pilots/flights")).toBe(false);
  });

  test("absolute, empty and placeholder links never light", () => {
    expect(isCurrentPath("https://ceruleanavi.net", "/")).toBe(false);
    expect(isCurrentPath("#", "/")).toBe(false);
    expect(isCurrentPath("", "/")).toBe(false);
    expect(isCurrentPath(undefined, "/")).toBe(false);
  });
});
