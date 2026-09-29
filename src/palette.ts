/**
 * ⌘K data: what the palette lists and how it matches.
 *
 * Results come in two parts: the current site's own nav, built from the
 * frame's props, then other sites' `pages` (`sitePages.ts`), grouped by site.
 * Same-site items link by path, other sites by full origin.
 *
 * Filtering is presentation only. Every site and can-api gate their own
 * routes.
 */
import type { IconName } from "./icons";
import { LOCALES } from "./i18n";
import {
  navLeaves,
  type NavItem,
  type NavSecondary,
  type Workspace,
} from "./nav";
import {
  SITE_BY_KEY,
  siteLabel,
  siteUrl,
  visibleSites,
  type NetworkPage,
  type SiteKey,
  type SiteOrigins,
} from "./sites";

export interface CommandItem {
  name: string;
  href: string;
  icon: IconName;
  /** Label beside the name — the nav section it belongs to. */
  section?: string;
  /** Heading the item is listed under. Adjacent items with one group share it. */
  group?: string;
  /** Matched after name, section and href: other-locale titles, synonyms. */
  keywords?: string[];
  /** Stable identity. Defaults to `href`. */
  key?: string;
}

function contains(value: string | undefined, needle: string): boolean {
  return !!value && value.toLowerCase().includes(needle);
}

/**
 * How well an item matches. `needle` is trimmed and lower-case.
 * 0: name, section or href. 1: group or keyword. null: no match.
 */
export function commandTier(item: CommandItem, needle: string): 0 | 1 | null {
  if (
    contains(item.name, needle) ||
    contains(item.section, needle) ||
    contains(item.href, needle)
  ) {
    return 0;
  }
  if (
    contains(item.group, needle) ||
    (item.keywords ?? []).some((keyword) => contains(keyword, needle))
  ) {
    return 1;
  }
  return null;
}

/**
 * The palette's matcher.
 *
 * Empty query: every item, in order. Otherwise the matching items, with each
 * group kept together. A group holding a tier-0 match comes before a group
 * with keyword matches only; inside a group tier-0 items come first. Ties
 * keep input order.
 */
export function filterCommands(
  items: readonly CommandItem[],
  query: string,
): CommandItem[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...items];

  const ranked = items.flatMap((item, index) => {
    const tier = commandTier(item, needle);
    return tier === null
      ? []
      : [{ item, index, tier, group: item.group ?? "" }];
  });

  const groupRank = new Map<string, { tier: number; index: number }>();
  for (const entry of ranked) {
    const seen = groupRank.get(entry.group);
    if (!seen)
      groupRank.set(entry.group, { tier: entry.tier, index: entry.index });
    else if (entry.tier < seen.tier) seen.tier = entry.tier;
  }

  return ranked
    .sort((a, b) => {
      const ga = groupRank.get(a.group) as { tier: number; index: number };
      const gb = groupRank.get(b.group) as { tier: number; index: number };
      return (
        ga.tier - gb.tier ||
        ga.index - gb.index ||
        a.tier - b.tier ||
        a.index - b.index
      );
    })
    .map((entry) => entry.item);
}

export interface NavCommandInput {
  navigation: readonly NavItem[];
  workspaces?: readonly Workspace[];
  secondary?: NavSecondary;
  /** Section label on workspace entries. */
  workspaceLabel: string;
  /** Heading for every item. */
  group?: string;
}

/**
 * The site's own nav as palette items: workspaces, nav items and their
 * children, then the pinned secondary links. `#` placeholders are skipped.
 */
export function navCommandItems(input: NavCommandInput): CommandItem[] {
  const items: CommandItem[] = [];
  const push = (item: CommandItem) => {
    if (!item.href || item.href === "#") return;
    items.push(input.group ? { ...item, group: input.group } : item);
  };

  for (const workspace of input.workspaces ?? []) {
    push({
      name: workspace.name,
      href: workspace.href,
      icon: workspace.icon,
      section: input.workspaceLabel,
    });
  }
  for (const leaf of navLeaves(input.navigation)) {
    push({
      name: leaf.name,
      href: leaf.href,
      icon: leaf.icon,
      ...(leaf.group ? { section: leaf.group } : {}),
    });
  }
  for (const item of input.secondary?.items ?? []) {
    push({
      name: item.name,
      href: item.href,
      icon: item.icon ?? "arrowPath",
      section: input.secondary?.label,
    });
  }
  return items;
}

/**
 * Whether a page is worth listing for this member.
 *
 * A missing rating hides a floored page, the same rule as `visibleSites`.
 */
export function pageVisible(
  page: NetworkPage,
  signedIn: boolean,
  rating?: number,
): boolean {
  if (page.signedIn && !signedIn) return false;
  if (page.minRating === undefined) return true;
  return signedIn && typeof rating === "number" && rating >= page.minRating;
}

/** The page's title in `locale`; English for an unknown code. */
export function pageTitle(page: NetworkPage, locale: string): string {
  return (
    (page.title as Readonly<Record<string, string>>)[locale] ??
    page.title["en-us"]
  );
}

/** The other locales' titles, then the page's keywords, without duplicates. */
export function pageKeywords(page: NetworkPage, locale: string): string[] {
  const own = pageTitle(page, locale);
  const words = [
    ...LOCALES.map((code) => page.title[code]),
    ...(page.keywords ?? []),
  ];
  return [...new Set(words)].filter((word) => word !== own);
}

export interface PaletteOptions {
  current: SiteKey;
  locale: string;
  signedIn: boolean;
  /** Session rating. A drawing hint, never a guard. */
  rating?: number;
  /** Dev/staging origin overrides — see `siteUrl`. */
  origins?: SiteOrigins;
}

/** Other sites' pages, in `NETWORK_SITES` order, grouped by site name. */
export function networkPageItems(options: PaletteOptions): CommandItem[] {
  const { current, locale, signedIn, rating, origins } = options;
  return visibleSites({
    locale,
    current,
    rating,
    signedIn,
    excludeCurrent: true,
    origins,
  }).flatMap((site) =>
    SITE_BY_KEY[site.key].pages
      .filter((page) => pageVisible(page, signedIn, rating))
      .map((page) => ({
        key: `${site.key}:${page.key}`,
        name: pageTitle(page, locale),
        href: siteUrl(site.key, page.path, origins),
        icon: page.icon,
        group: site.name,
        keywords: pageKeywords(page, locale),
      })),
  );
}

export interface FramePaletteOptions
  extends PaletteOptions, Omit<NavCommandInput, "group"> {}

/**
 * Everything `CanFrame` hands the palette: own nav under the site's name,
 * then `networkPageItems`. A second item with an href already listed is dropped.
 */
export function framePaletteItems(options: FramePaletteOptions): CommandItem[] {
  const own = navCommandItems({
    ...options,
    group: siteLabel(options.locale, options.current).name,
  });
  const seen = new Set<string>();
  return [...own, ...networkPageItems(options)].filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}
