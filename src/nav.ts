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

export interface NavChild {
  name: string;
  href: string;
  icon?: string;
}

export interface NavItem {
  name: string;
  /** Omit on a group — an item with `children` and no `href` is a section. */
  href?: string;
  /** ICON_PATHS key. */
  icon: string;
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
  icon: string;
}
