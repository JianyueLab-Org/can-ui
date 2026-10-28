import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

/**
 * The token values the avionics look depends on, and the contrast they must
 * keep. Nothing on screen fails when a token drifts below AA — it just becomes
 * harder to read — so the ratios are checked here.
 */
const css = readFileSync(
  new URL("./styles/tokens.css", import.meta.url),
  "utf8",
);

function block(selector: string): string {
  const start = css.indexOf(`\n${selector} {`);
  if (start < 0) throw new Error(`no ${selector} block`);
  const end = css.indexOf("\n}", start);
  return css.slice(start, end);
}

function value(source: string, name: string): string | undefined {
  const match = source.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return match?.[1].trim().toLowerCase();
}

const theme = block("@theme");
const root = block(":root");
const dark = block(":root.dark");

function light(name: string): string {
  const found = value(root, name) ?? value(theme, name);
  if (!found) throw new Error(`--${name} has no light value`);
  return found;
}

function darkValue(name: string): string {
  return value(dark, name) ?? light(name);
}

function luminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/../g)!
    .map((pair) => parseInt(pair, 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("brand", () => {
  test("light #1a73b5, dark #47b5fa", () => {
    expect(light("color-can")).toBe("#1a73b5");
    expect(darkValue("color-can")).toBe("#47b5fa");
  });

  test("brand text reaches AA on every page surface", () => {
    for (const surface of ["surface", "background", "surface-sunken"]) {
      expect(
        contrast(light("color-can"), light(surface)),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(darkValue("color-can"), darkValue(surface)),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("text on the brand fill reaches AA, both themes", () => {
    for (const fill of ["color-can", "color-can-dark"]) {
      expect(
        contrast(light("color-on-can"), light(fill)),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(darkValue("color-on-can"), darkValue(fill)),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("text", () => {
  test("ink reaches AAA and muted reaches AA on the surface, both themes", () => {
    expect(
      contrast(light("color-ink"), light("surface")),
    ).toBeGreaterThanOrEqual(7);
    expect(
      contrast(darkValue("color-ink"), darkValue("surface")),
    ).toBeGreaterThanOrEqual(7);
    expect(
      contrast(light("color-muted"), light("surface")),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      contrast(darkValue("color-muted"), darkValue("surface")),
    ).toBeGreaterThanOrEqual(4.5);
  });

  const surfaces = [
    "background",
    "surface",
    "surface-raised",
    "surface-sunken",
    "surface-overlay",
    "chrome",
  ];

  test("faint reaches AA on every page surface, both themes", () => {
    for (const surface of surfaces) {
      expect(
        contrast(light("color-faint"), light(surface)),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrast(darkValue("color-faint"), darkValue(surface)),
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  test("faint stays a tier below muted, both themes", () => {
    for (const [tone, surface] of [
      [light, light("surface")],
      [darkValue, darkValue("surface")],
    ] as const) {
      const muted = contrast(tone("color-muted"), surface);
      const faint = contrast(tone("color-faint"), surface);
      expect(muted / faint).toBeGreaterThanOrEqual(1.4);
    }
  });
});

describe("shape", () => {
  test("square corners", () => {
    expect(light("radius-control")).toBe("0.125rem");
    expect(light("radius-card")).toBe("0.125rem");
    expect(light("radius-inset")).toBe("0.125rem");
    expect(light("radius-sheet")).toBe("0.25rem");
  });

  test("materials are opaque and unblurred", () => {
    for (const weight of ["thin", "regular", "thick"]) {
      expect(light(`material-blur-${weight}`)).toBe("0px");
      expect(light(`material-${weight}`)).not.toContain("/");
      expect(darkValue(`material-${weight}`)).not.toContain("/");
    }
  });
});
