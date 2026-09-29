import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RAIL_STORAGE_KEY, effectiveRail, initialRail } from "./rail";

describe("initialRail", () => {
  test("an explicit choice is kept", () => {
    expect(initialRail("collapsed")).toBe("collapsed");
    expect(initialRail("expanded")).toBe("expanded");
  });

  test("anything else is auto", () => {
    expect(initialRail(null)).toBe("auto");
    expect(initialRail(undefined)).toBe("auto");
    expect(initialRail("sideways")).toBe("auto");
  });
});

describe("effectiveRail", () => {
  test("an explicit data-rail wins", () => {
    expect(effectiveRail("collapsed", "expanded")).toBe("collapsed");
    expect(effectiveRail("expanded", "collapsed")).toBe("expanded");
  });

  test("auto asks the CSS answer", () => {
    expect(effectiveRail("auto", " collapsed")).toBe("collapsed");
    expect(effectiveRail("auto", "expanded")).toBe("expanded");
    expect(effectiveRail(undefined, "")).toBe("expanded");
  });
});

test("RailScript reads the same storage key", () => {
  const source = readFileSync(
    join(import.meta.dir, "components/RailScript.astro"),
    "utf8",
  );
  expect(source).toContain(
    `localStorage.getItem(${JSON.stringify(RAIL_STORAGE_KEY)})`,
  );
});
