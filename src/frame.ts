/**
 * The pure half of `CanFrame`, `AccountMenu` and `NoAccess`.
 */
import type { IconName } from "./icons";
import { navLeaves, type NavItem, type NavLeaf } from "./nav";
import {
  visibleSites,
  type ResolvedSite,
  type SiteKey,
  type SiteOrigins,
} from "./sites";

/** See `CanFrame.vue`. */
export type FrameLayout = "content" | "tool" | "rail" | "map";

/** The signed-in member, as the frame shows them. */
export interface FrameUser {
  name: string;
  /** CID. Shown as `#id`. */
  id: string | number;
  /** Menu and palette hints only. */
  rating?: number;
}

export interface FrameLink {
  name: string;
  href: string;
  icon: IconName;
}

/**
 * Nav as a flat list of links: items with an href, then each group's
 * children with the group's icon as fallback. `#` placeholders are dropped;
 * absolute `http(s)` links only with `external: true`.
 */
export function frameLinks(
  nav: readonly NavItem[],
  options: { external?: boolean } = {},
): FrameLink[] {
  return navLeaves(nav)
    .filter((leaf) => options.external || !isAbsolute(leaf.href))
    .map(({ name, href, icon }) => ({ name, href, icon }));
}

const isAbsolute = (href: string) => /^https?:\/\//.test(href);

export type NoAccessReason =
  { kind: "rating"; required: number } | { kind: "permission"; name: string };

/** The message key and values that explain a refusal. */
export function noAccessText(reason: NoAccessReason): {
  key: string;
  values: Record<string, string | number>;
} {
  return reason.kind === "rating"
    ? { key: "noAccess.rating", values: { required: reason.required } }
    : { key: "noAccess.permission", values: { name: reason.name } };
}

export interface ReachableOptions {
  current: SiteKey;
  locale: string;
  rating?: number;
  origins?: SiteOrigins;
}

/** The sites a refused member can still use: signed in, current site dropped. */
export function reachableSites(options: ReachableOptions): ResolvedSite[] {
  return visibleSites({ ...options, signedIn: true, excludeCurrent: true });
}

/** Tabs the phone tab bar holds before ⌘K and "Me". */
const RAIL_TAB_LIMIT = 3;

/**
 * Splits the site's nav for the rail layout under 768px. The desktop rail
 * keeps its groups; this flattens them for the phone only.
 *
 * Leaves are `navLeaves`. `tabs`: the internal leaves flagged `phoneTab`, at
 * most three; with none flagged, the first three internal leaves. Absolute
 * links are never tabs. `overflow`: every other leaf, listed at the top of
 * "Me".
 */
export function railTabs(nav: readonly NavItem[]): {
  tabs: FrameLink[];
  overflow: FrameLink[];
} {
  const leaves = navLeaves(nav);
  const internal = leaves.filter((leaf) => !isAbsolute(leaf.href));
  const flagged = internal.filter((leaf) => leaf.phoneTab);
  const picked = (flagged.length > 0 ? flagged : internal).slice(
    0,
    RAIL_TAB_LIMIT,
  );
  const link = ({ name, href, icon }: NavLeaf): FrameLink => ({
    name,
    href,
    icon,
  });
  return {
    tabs: picked.map(link),
    overflow: leaves.filter((leaf) => !picked.includes(leaf)).map(link),
  };
}
