import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import * as frame from "./frameEntry";

test("the /frame entry exports the frame's pure half", () => {
  expect(Object.keys(frame).sort()).toEqual([
    "RAIL_STORAGE_KEY",
    "SIGN_OUT_PATH",
    "currentRail",
    "effectiveRail",
    "frameLinks",
    "initialRail",
    "railTabs",
    "reachableSites",
    "setRail",
    "signOut",
    "signOutDestination",
  ]);
});

/**
 * Middleware and endpoints import this subpath. Bun cannot load a `.vue`
 * file, so the import above already proves none is reached; this walk also
 * rejects the `vue` package itself.
 */
test("no module in its graph imports vue or a .vue file", () => {
  const seen = new Set<string>();
  const walk = (file: string) => {
    if (seen.has(file)) return;
    seen.add(file);
    const source = readFileSync(file, "utf8");
    const specifiers = source.matchAll(
      /(?:import|export)[^;]*?from\s+["']([^"']+)["']/g,
    );
    for (const match of specifiers) {
      const spec = match[1] ?? "";
      expect(spec).not.toBe("vue");
      expect(spec.endsWith(".vue")).toBe(false);
      if (spec.startsWith(".")) {
        walk(
          resolve(dirname(file), spec.endsWith(".ts") ? spec : `${spec}.ts`),
        );
      }
    }
  };
  walk(join(import.meta.dir, "frameEntry.ts"));
  expect(seen.size).toBeGreaterThan(3);
});
