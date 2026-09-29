import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import {
  listPageFiles,
  missingPages,
  routeFromFile,
  routeMatches,
  runCheckPages,
} from "./checkPages";

const FIXTURE = join(import.meta.dir, "../test/fixtures/pages");

function recorder() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    logger: {
      log: (message: string) => out.push(message),
      error: (message: string) => err.push(message),
    },
  };
}

describe("routeFromFile", () => {
  test("index files map to their directory", () => {
    expect(routeFromFile("index.astro")?.segments).toEqual([]);
    expect(routeFromFile("pilots/index.astro")?.segments).toEqual(["pilots"]);
    expect(routeFromFile("roster.astro")?.segments).toEqual(["roster"]);
    expect(routeFromFile("about.md")?.segments).toEqual(["about"]);
  });

  test("endpoints, partials and catch-alls serve no page here", () => {
    expect(routeFromFile("api/v1/signout.ts")).toBeNull();
    expect(routeFromFile("_draft.astro")).toBeNull();
    expect(routeFromFile("docs/[...path].astro")).toBeNull();
  });
});

describe("routeMatches", () => {
  test("a trailing slash is the same route", () => {
    const route = routeFromFile("pilots/index.astro");
    expect(route && routeMatches("/pilots/", route)).toBe(true);
    expect(route && routeMatches("/pilots", route)).toBe(true);
  });

  test("the root", () => {
    const route = routeFromFile("index.astro");
    expect(route && routeMatches("/", route)).toBe(true);
    expect(route && routeMatches("/roster", route)).toBe(false);
  });

  test("a parameter matches one segment", () => {
    const route = routeFromFile("activities/[id].astro");
    expect(route && routeMatches("/activities/42", route)).toBe(true);
    expect(route && routeMatches("/activities", route)).toBe(false);
  });
});

describe("missingPages", () => {
  test("exam with both routes is complete", () => {
    expect(missingPages("exam", ["index.astro", "admin/index.astro"])).toEqual(
      [],
    );
  });

  test("exam without /admin is missing questionBank", () => {
    expect(
      missingPages("exam", ["index.astro"]).map((page) => page.key),
    ).toEqual(["questionBank"]);
  });
});

describe("listPageFiles", () => {
  test("lists page files, relative and sorted", () => {
    expect(listPageFiles(FIXTURE)).toEqual([
      "_draft.astro",
      "about.md",
      "activities/[id].astro",
      "admin/index.astro",
      "docs/[...path].astro",
      "index.astro",
      "pilots/index.astro",
    ]);
  });
});

describe("runCheckPages", () => {
  test("exit 0 when every page has a route", () => {
    const r = recorder();
    expect(runCheckPages(["exam", FIXTURE], "/", r.logger)).toBe(0);
    expect(r.err).toEqual([]);
    expect(r.out[0]).toContain("2 exam pages");
  });

  test("exit 1 and one line per missing page", () => {
    const r = recorder();
    expect(runCheckPages(["controller", FIXTURE], "/", r.logger)).toBe(1);
    expect(r.err).toHaveLength(3);
    expect(r.err[0]).toContain("controller:atis");
  });

  test("exit 2 on an unknown site or a missing directory", () => {
    expect(runCheckPages(["nope"], "/", recorder().logger)).toBe(2);
    expect(runCheckPages([], "/", recorder().logger)).toBe(2);
    expect(runCheckPages(["toString"], "/", recorder().logger)).toBe(2);
    expect(
      runCheckPages(["exam", "does/not/exist"], FIXTURE, recorder().logger),
    ).toBe(2);
  });

  test("the directory is resolved against cwd", () => {
    const r = recorder();
    expect(
      runCheckPages(["radar", "pages"], join(FIXTURE, ".."), r.logger),
    ).toBe(0);
  });
});
