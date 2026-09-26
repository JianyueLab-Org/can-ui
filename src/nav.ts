/**
 * The navigation data a shell renders.
 *
 * Plain data, declared by the site, because only the site knows its own
 * routes. can-ui renders it and decides nothing about it — which is what makes
 * one shell serve a pilot portal, a controller centre and an exam centre
 * without any of them appearing in this package.
 *
 * The one thing worth stating: **name every entry for what is in it.** "进度",
 * "题库", "机组" are predictable; "首页", "更多", "其他" are not, and a nav
 * whose labels do not predict their contents costs a click every time.
 */

import type { IconName } from "./icons";
import type { Translator } from "./i18n";
import {
  SITE_BY_KEY,
  WORKSPACE_SITE_KEYS,
  siteUrl,
  type NetworkSite,
  type SiteKey,
  type SiteOrigins,
} from "./sites";

export interface NavChild {
  name: string;
  href: string;
  icon?: IconName;
}

export interface NavItem {
  name: string;
  /** Omit on a group — an item with `children` and no `href` is a section. */
  href?: string;
  /** ICON_PATHS key. */
  icon: IconName;
  children?: NavChild[];
}

/**
 * Always-visible cross-links pinned to the foot of the rail.
 *
 * These used to live inside a collapsed "quick access" accordion, which put
 * the most-used links in the product two clicks away and behind a guess.
 */
export interface NavSecondary {
  label: string;
  items: NavChild[];
}

/**
 * A top-level section of the product — pilots, controllers, the exam centre.
 *
 * Rendered as a switcher pinned above the nav, so crossing between sections is
 * one click rather than a trip back to the home page. Labels only, no icons:
 * at three segments a CJK label leaves no room for one.
 */
export interface Workspace {
  key: string;
  name: string;
  href: string;
  /** Used by the command palette, which has room for one. */
  icon: IconName;
}

/**
 * Whether a link points at the page being viewed.
 *
 * Prefix-aware but not naively so. A link to `/exams` must light on
 * `/exams/papers`, but a link to `/exams/` — a section root — must *not*
 * light on every route beneath it, or the dashboard entry is lit on every page
 * in the section and stops meaning anything. The trailing slash is the
 * opt-out, and the character check after the prefix is what stops `/exam`
 * matching `/examples`.
 *
 * Shared by `SidebarNav`, `SiteHeader` and can-efb's rail. It used to be three
 * copies — SidebarNav's, can-efb's `lib/nav.ts`, and an `isActive` in each
 * page site's header — which agreed only by accident.
 */
export function isCurrentPath(
  href: string | undefined,
  pathname: string,
): boolean {
  if (!href || href === "#" || href.startsWith("http")) return false;
  if (href.endsWith("/")) {
    return pathname === href || pathname === href.slice(0, -1);
  }
  if (pathname === href) return true;
  if (pathname.startsWith(href)) {
    const nextChar = pathname[href.length];
    return !nextChar || nextChar === "/";
  }
  return false;
}

/** The three sections. Keys are what `AppShell`'s `activeWorkspace` compares. */
export type WorkspaceKey = "pilots" | "controllers" | "exams";

export interface WorkspaceOptions {
  /**
   * The site rendering the switcher. Its own section links by path rather
   * than by origin, so the switcher keeps working on a dev box where that
   * site is on localhost.
   */
  current?: SiteKey;
  /** Session rating, for `minRating`. A drawing hint, never a guard. */
  rating?: number;
  /**
   * Dev/staging origin overrides — see `siteUrl` in `sites.ts`. Reaches only
   * the off-main-site entries; the calling site's own entry links by path
   * regardless, so an override for it would be a no-op.
   */
  origins?: SiteOrigins;
}

interface WorkspaceSpec {
  key: WorkspaceKey;
  site: SiteKey;
  path: string;
  icon: IconName;
}

/**
 * Which section each off-main-site switcher entry is.
 *
 * Keyed by site so the list itself comes from `WORKSPACE_SITE_KEYS` — the
 * same constant `NetworkMenu` callers pass as `exclude`, so the switcher and
 * the network menu cannot disagree about which sites the switcher covers. A
 * key added there without a row here drops out of the switcher, and
 * `nav.test.ts` fails on the count.
 */
const SECTION_BY_SITE: Readonly<Partial<Record<SiteKey, WorkspaceKey>>> = {
  controller: "controllers",
  exam: "exams",
};

function workspaceSpecs(): WorkspaceSpec[] {
  // The pilot section is a page of the main site, not a site: it points at
  // `/pilots/`, where the network menu's main-site entry points at `/`.
  const specs: WorkspaceSpec[] = [
    { key: "pilots", site: "web", path: "/pilots/", icon: "paperAirplane" },
  ];
  for (const site of WORKSPACE_SITE_KEYS) {
    const key = SECTION_BY_SITE[site];
    if (!key) continue;
    specs.push({
      key,
      site,
      path: SITE_BY_KEY[site].path,
      icon: SITE_BY_KEY[site].icon,
    });
  }
  return specs;
}

/**
 * Whether a section's site clears its `minRating` hint.
 *
 * A missing rating hides more, not less — the same choice `visibleSites`
 * makes, with the same explicit `typeof`.
 */
export function workspaceVisible(site: NetworkSite, rating?: number): boolean {
  if (site.minRating === undefined) return true;
  return typeof rating === "number" && rating >= site.minRating;
}

/**
 * The section switcher every `AppShell` site draws.
 *
 * It replaces four copies — can-web's `lib/workspaces.ts` and the
 * `buildWorkspaces` in can-controller, can-portal and can-database — which had
 * already drifted: can-web sent 考试 to its own `/exams/`, the other three to
 * exam.ceruleanavi.net. The exam centre is one site; the switcher now says so
 * everywhere.
 *
 * `t` is the site's translator over whichever namespace holds
 * `workspace.pilots` / `workspace.controllers` / `workspace.exams`. The names
 * stay in the site's dictionary: they label sections of the product, which is
 * site copy, not the network naming its own components.
 */
export function buildWorkspaces(
  t: Translator,
  options: WorkspaceOptions = {},
): Workspace[] {
  const { current, rating, origins } = options;
  return workspaceSpecs()
    .filter((spec) => workspaceVisible(SITE_BY_KEY[spec.site], rating))
    .map((spec) => ({
      key: spec.key,
      name: t(`workspace.${spec.key}`),
      href:
        spec.site === current
          ? spec.path
          : siteUrl(spec.site, spec.path, origins),
      icon: spec.icon,
    }));
}
