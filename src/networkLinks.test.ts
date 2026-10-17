import { describe, expect, test } from "bun:test";
import { ICON_PATHS } from "./icons";
import {
  accountLinks,
  currentEntryName,
  networkGroups,
  NETWORK_TEXT,
} from "./networkLinks";
import { RATING_ADMIN, RATING_INSTRUCTOR } from "./ratings";

const keysOf = (groups: ReturnType<typeof networkGroups>) =>
  groups.map((g) => [g.key, g.entries.map((e) => e.key)]);

describe("networkGroups", () => {
  test("an administrator sees all five groups in order", () => {
    const groups = networkGroups({
      locale: "en-us",
      signedIn: true,
      rating: RATING_ADMIN,
    });
    expect(keysOf(groups)).toEqual([
      ["public", ["web", "radar", "docs"]],
      ["flying", ["web:pilots", "efb"]],
      ["controlling", ["controller", "exam"]],
      ["management", ["portal", "database"]],
      ["developers", ["dev"]],
    ]);
  });

  test("a signed-out visitor sees only public sites, and empty groups drop", () => {
    const groups = networkGroups({ locale: "en-us" });
    expect(keysOf(groups)).toEqual([
      ["public", ["web", "radar", "docs"]],
      ["developers", ["dev"]],
    ]);
  });

  test("an instructor sees the portal but not the database", () => {
    const groups = networkGroups({
      locale: "en-us",
      signedIn: true,
      rating: RATING_INSTRUCTOR,
    });
    const management = groups.find((g) => g.key === "management");
    expect(management?.entries.map((e) => e.key)).toEqual(["portal"]);
  });

  test("a member without a resolved rating sees no gated site", () => {
    const groups = networkGroups({ locale: "en-us", signedIn: true });
    expect(groups.find((g) => g.key === "management")).toBeUndefined();
  });

  test("the pilot panel links to /pilots/ on the main site", () => {
    const flying = networkGroups({ locale: "zh-cn", signedIn: true }).find(
      (g) => g.key === "flying",
    );
    const panel = flying?.entries[0];
    expect(panel?.href).toBe("https://ceruleanavi.net/pilots/");
    expect(panel?.name).toBe("飞行员面板");
    expect(panel?.icon).toBe("paperAirplane");
  });

  test("current marks the pilot panel under /pilots and the main site elsewhere", () => {
    const onPanel = networkGroups({
      locale: "en-us",
      signedIn: true,
      current: "web",
      pathname: "/pilots/flights",
    }).flatMap((g) => g.entries);
    expect(onPanel.filter((e) => e.current).map((e) => e.key)).toEqual([
      "web:pilots",
    ]);

    const onHome = networkGroups({
      locale: "en-us",
      signedIn: true,
      current: "web",
      pathname: "/activities",
    }).flatMap((g) => g.entries);
    expect(onHome.filter((e) => e.current).map((e) => e.key)).toEqual(["web"]);
  });

  test("origin overrides reach every href", () => {
    const entries = networkGroups({
      locale: "en-us",
      signedIn: true,
      origins: { web: "http://localhost:4321" },
    }).flatMap((g) => g.entries);
    expect(entries.find((e) => e.key === "web:pilots")?.href).toBe(
      "http://localhost:4321/pilots/",
    );
  });

  test("every entry icon exists", () => {
    const entries = networkGroups({
      locale: "en-us",
      signedIn: true,
      rating: RATING_ADMIN,
    }).flatMap((g) => g.entries);
    for (const entry of entries) expect(ICON_PATHS[entry.icon]).toBeDefined();
  });
});

describe("currentEntryName", () => {
  test("names the pilot panel under /pilots and the site elsewhere", () => {
    expect(
      currentEntryName({
        locale: "en-us",
        current: "web",
        pathname: "/pilots/",
      }),
    ).toBe("Pilot Panel");
    expect(
      currentEntryName({ locale: "en-us", current: "web", pathname: "/" }),
    ).toBe("Main Site");
    expect(currentEntryName({ locale: "en-us", current: "exam" })).toBe(
      "Exam Centre",
    );
  });
});

describe("accountLinks", () => {
  test("pilot panel then account, on the main site", () => {
    expect(accountLinks("en-us")).toEqual([
      {
        key: "pilots",
        name: "Pilot Panel",
        href: "https://ceruleanavi.net/pilots/",
        icon: "paperAirplane",
      },
      {
        key: "account",
        name: "Account",
        href: "https://ceruleanavi.net/pilots/account",
        icon: "userCircle",
      },
    ]);
  });

  test("origin overrides reach the links", () => {
    expect(
      accountLinks("en-us", { web: "http://localhost:4321" })[1].href,
    ).toBe("http://localhost:4321/pilots/account");
  });
});

describe("NETWORK_TEXT", () => {
  test("every locale has every string, and an unknown locale falls back to English", () => {
    for (const text of Object.values(NETWORK_TEXT)) {
      for (const heading of Object.values(text.groups))
        expect(heading.length).toBeGreaterThan(0);
      expect(text.pilotPanel.name.length).toBeGreaterThan(0);
      expect(text.pilotPanel.tagline.length).toBeGreaterThan(0);
      expect(text.account.length).toBeGreaterThan(0);
    }
    expect(Object.keys(NETWORK_TEXT).sort()).toEqual([
      "en-us",
      "ja-jp",
      "zh-cn",
      "zh-tw",
    ]);
    expect(accountLinks("xx-yy")[1].name).toBe("Account");
  });
});
