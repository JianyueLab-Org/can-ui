import { describe, expect, test } from "bun:test";
import { LOCALES } from "./i18n";
import { NOT_FOUND_UI, notFoundLinks, notFoundText } from "./notFound";
import { siteUrl } from "./sites";

const KEYS = ["code", "title", "description", "home", "radar", "docs"] as const;

describe("NOT_FOUND_UI", () => {
  test("every locale has every key, non-empty", () => {
    for (const locale of LOCALES) {
      for (const key of KEYS) {
        expect(NOT_FOUND_UI[locale][key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  test("an unknown locale falls back to zh-cn", () => {
    expect(notFoundText("fr-fr")).toEqual(NOT_FOUND_UI["zh-cn"]);
    expect(notFoundText("")).toEqual(NOT_FOUND_UI["zh-cn"]);
    expect(notFoundText("en-us")).toEqual(NOT_FOUND_UI["en-us"]);
  });
});

describe("notFoundLinks", () => {
  test("web gets home, radar and docs from siteUrl", () => {
    const links = notFoundLinks({ current: "web", locale: "en-us" });
    expect(links.map((l) => l.key)).toEqual(["home", "radar", "docs"]);
    expect(links.map((l) => l.variant)).toEqual([
      "primary",
      "secondary",
      "ghost",
    ]);
    expect(links[0].href).toBe("/");
    expect(links[1].href).toBe(siteUrl("radar"));
    expect(links[2].href).toBe(siteUrl("docs"));
    expect(links[1].label).toBe(NOT_FOUND_UI["en-us"].radar);
  });

  test("radar drops the radar link", () => {
    const keys = notFoundLinks({ current: "radar", locale: "zh-cn" }).map(
      (l) => l.key,
    );
    expect(keys).toEqual(["home", "docs"]);
  });

  test("docs drops the docs link", () => {
    const keys = notFoundLinks({ current: "docs", locale: "zh-cn" }).map(
      (l) => l.key,
    );
    expect(keys).toEqual(["home", "radar"]);
  });

  test("origins override flows into the hrefs", () => {
    const origins = {
      radar: "http://localhost:4323/",
      docs: "http://localhost:5173",
    };
    const links = notFoundLinks({ current: "web", locale: "zh-cn", origins });
    expect(links[1].href).toBe("http://localhost:4323/");
    expect(links[2].href).toBe("http://localhost:5173/");
  });

  test("homeHref is honoured", () => {
    const links = notFoundLinks({
      current: "exam",
      locale: "ja-jp",
      homeHref: "/zh_CN/",
    });
    expect(links[0].href).toBe("/zh_CN/");
    expect(links[0].label).toBe(NOT_FOUND_UI["ja-jp"].home);
  });
});
