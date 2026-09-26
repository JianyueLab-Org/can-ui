/**
 * The pure half of `SiteHeader`, split out so it can be tested without
 * mounting a component.
 */

import { visibleSites, type ResolvedSite, type SiteKey } from "./sites";

/**
 * Every string the header renders itself. The site passes them from its own
 * dictionary; can-ui never picks a locale.
 *
 * `signIn` / `signOut` are only read by the default account area — a site
 * that fills the `account` and `drawer-extra` slots never shows them — and
 * fall back to `CHROME_MESSAGES` like every other chrome string.
 */
export interface SiteHeaderLabels {
  /** Skip link. */
  skip: string;
  /** Menu button's accessible name, and the drawer's. */
  menu: string;
  /** Drawer close button's accessible name. */
  close: string;
  signIn?: string;
  signOut?: string;
}

export interface HeaderNetworkOptions {
  current: SiteKey;
  locale: string;
  /** Menu only — see `sites.ts`. */
  rating?: number;
  signedIn: boolean;
}

/**
 * The drawer's copy of the network menu.
 *
 * On a phone the `NetworkMenu` popover would open underneath the drawer it was
 * launched from, so the drawer lists the same sites inline. Same data, same
 * call, so the two presentations cannot disagree.
 */
export function headerNetworkSites(
  options: HeaderNetworkOptions,
): ResolvedSite[] {
  return visibleSites({
    locale: options.locale,
    current: options.current,
    rating: options.rating,
    signedIn: options.signedIn,
    excludeCurrent: true,
  });
}
