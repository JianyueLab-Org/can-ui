/**
 * `check:pages` — every `pages` entry for a site must name a route that the
 * site's `src/pages` serves.
 *
 * Node only; not in the barrel. Import from
 * `@jianyuelab-org/can-ui/check-pages`, or run `can-ui-check-pages`.
 *
 * Catch-all routes (`[...path]`) do not count: on these sites they are
 * forwarders, and a forwarder would satisfy every path under it.
 */
import { readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { SITE_BY_KEY, type NetworkPage, type SiteKey } from "./sites";

export const PAGE_EXTENSIONS = [".astro", ".md", ".mdx", ".html"] as const;

export interface PageRoute {
  /** Path relative to `src/pages`, with `/` separators. */
  file: string;
  /** URL segments. `[param]` segments match any one segment. */
  segments: string[];
}

/** A file under `src/pages` as a route, or null when it serves no page. */
export function routeFromFile(file: string): PageRoute | null {
  const extension = PAGE_EXTENSIONS.find((ext) => file.endsWith(ext));
  if (!extension) return null;
  const parts = file.slice(0, -extension.length).split("/").filter(Boolean);
  if (parts.some((part) => part.startsWith("_"))) return null;
  if (parts.some((part) => part.startsWith("[..."))) return null;
  if (parts[parts.length - 1] === "index") parts.pop();
  return { file, segments: parts };
}

function isParam(segment: string): boolean {
  return segment.startsWith("[") && segment.endsWith("]");
}

/** Whether a registry path is served by a route. Trailing slashes are ignored. */
export function routeMatches(path: string, route: PageRoute): boolean {
  const segments = path.split("/").filter(Boolean);
  if (segments.length !== route.segments.length) return false;
  return route.segments.every(
    (segment, i) => isParam(segment) || segment === segments[i],
  );
}

/** The site's registry pages that no file in `files` serves. */
export function missingPages(
  site: SiteKey,
  files: readonly string[],
): NetworkPage[] {
  const routes = files
    .map(routeFromFile)
    .filter((route): route is PageRoute => route !== null);
  return SITE_BY_KEY[site].pages.filter(
    (page) => !routes.some((route) => routeMatches(page.path, route)),
  );
}

/** Page files under `dir`, relative, `/`-separated, sorted. */
export function listPageFiles(dir: string): string[] {
  const out: string[] = [];
  const walk = (relative: string) => {
    const entries = readdirSync(join(dir, relative), { withFileTypes: true });
    for (const entry of entries) {
      const child = relative ? `${relative}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(child);
      else if (PAGE_EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
        out.push(child);
      }
    }
  };
  walk("");
  return out.sort();
}

export interface CheckLogger {
  log(message: string): void;
  error(message: string): void;
}

/**
 * `can-ui-check-pages <site> [pagesDir]`. Returns the exit code:
 * 0 every page found, 1 pages missing, 2 bad arguments or unreadable directory.
 */
export function runCheckPages(
  args: readonly string[],
  cwd: string,
  logger: CheckLogger,
): number {
  const [site, dir = "src/pages"] = args;
  if (!site || !Object.hasOwn(SITE_BY_KEY, site)) {
    logger.error(
      `usage: can-ui-check-pages <${Object.keys(SITE_BY_KEY).join("|")}> [pagesDir]`,
    );
    return 2;
  }
  const key = site as SiteKey;

  let files: string[];
  try {
    files = listPageFiles(resolve(cwd, dir));
  } catch (error) {
    logger.error(`check:pages: cannot read ${dir}: ${String(error)}`);
    return 2;
  }

  const missing = missingPages(key, files);
  if (missing.length === 0) {
    logger.log(
      `check:pages: ${SITE_BY_KEY[key].pages.length} ${key} pages found in ${dir}`,
    );
    return 0;
  }
  for (const page of missing) {
    logger.error(
      `check:pages: ${key}:${page.key} → ${page.path} has no route in ${dir}`,
    );
  }
  return 1;
}
