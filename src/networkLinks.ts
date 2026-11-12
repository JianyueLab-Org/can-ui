/**
 * The network switcher's groups and the account menu's links.
 *
 * Grouped by audience — who opens the site — rather than by `SiteSection`,
 * which the footer still uses. The pilot panel is a page of the main site, not
 * a site, so it is an entry here and nowhere in `NETWORK_SITES`.
 *
 * Visibility comes from `visibleSites`, so this menu, the footer and ⌘K agree
 * on which sites a member can see.
 */
import type { IconName } from "./icons";
import {
  siteLabels,
  siteUrl,
  visibleSites,
  type SiteKey,
  type SiteOrigins,
} from "./sites";

export type NetworkGroupKey =
  "public" | "flying" | "controlling" | "management" | "developers";

/** The pilot panel's home. */
export const PILOT_PANEL_PATH = "/pilots/";
/** The account page. */
export const ACCOUNT_PATH = "/account";

interface EntrySpec {
  site: SiteKey;
  /** The pilot panel: a path on the main site, members only. */
  pilotPanel?: true;
}

const GROUPS: ReadonlyArray<{
  key: NetworkGroupKey;
  entries: readonly EntrySpec[];
}> = [
  {
    key: "public",
    entries: [{ site: "web" }, { site: "radar" }, { site: "docs" }],
  },
  {
    key: "flying",
    entries: [
      { site: "web", pilotPanel: true },
      { site: "efb" },
      { site: "va" },
    ],
  },
  { key: "controlling", entries: [{ site: "controller" }, { site: "exam" }] },
  { key: "management", entries: [{ site: "portal" }, { site: "database" }] },
  { key: "developers", entries: [{ site: "dev" }] },
];

export interface NetworkText {
  groups: Readonly<Record<NetworkGroupKey, string>>;
  pilotPanel: { name: string; tagline: string };
  account: string;
}

export const NETWORK_TEXT: Readonly<Record<string, NetworkText>> = {
  "zh-cn": {
    groups: {
      public: "公开",
      flying: "飞行",
      controlling: "管制",
      management: "管理",
      developers: "开发",
    },
    pilotPanel: { name: "飞行员面板", tagline: "飞行计划、记录与统计" },
    account: "账号设置",
  },
  "zh-tw": {
    groups: {
      public: "公開",
      flying: "飛行",
      controlling: "管制",
      management: "管理",
      developers: "開發",
    },
    pilotPanel: { name: "飛行員面板", tagline: "飛行計畫、紀錄與統計" },
    account: "帳號設定",
  },
  "en-us": {
    groups: {
      public: "Public",
      flying: "Flying",
      controlling: "Controlling",
      management: "Management",
      developers: "Developers",
    },
    pilotPanel: {
      name: "Pilot Panel",
      tagline: "Flight plans, logbook and stats",
    },
    account: "Account",
  },
  "ja-jp": {
    groups: {
      public: "公開",
      flying: "フライト",
      controlling: "管制",
      management: "管理",
      developers: "開発",
    },
    pilotPanel: { name: "パイロットパネル", tagline: "飛行計画・記録・統計" },
    account: "アカウント設定",
  },
};

function networkText(locale: string): NetworkText {
  return NETWORK_TEXT[locale] ?? NETWORK_TEXT["en-us"];
}

export interface NetworkGroupEntry {
  /** Site key, or `web:pilots` for the pilot panel. */
  key: string;
  site: SiteKey;
  href: string;
  icon: IconName;
  name: string;
  tagline: string;
  /** True for the entry the member is looking at. */
  current: boolean;
}

export interface NetworkGroup {
  key: NetworkGroupKey;
  heading: string;
  entries: NetworkGroupEntry[];
}

export interface NetworkGroupOptions {
  locale: string;
  current?: SiteKey;
  /** The current path, to tell the pilot panel from the rest of the main site. */
  pathname?: string;
  rating?: number;
  signedIn?: boolean;
  origins?: SiteOrigins;
}

function onPilotPanel(
  current: SiteKey | undefined,
  pathname: string | undefined,
): boolean {
  return current === "web" && (pathname ?? "").startsWith("/pilots");
}

/** The switcher's groups for this member, empty groups dropped. */
export function networkGroups(options: NetworkGroupOptions): NetworkGroup[] {
  const {
    locale,
    current,
    pathname,
    rating,
    signedIn = false,
    origins,
  } = options;
  const text = networkText(locale);
  const visible = new Map(
    visibleSites({ locale, current, rating, signedIn, origins }).map((site) => [
      site.key,
      site,
    ]),
  );
  const panel = onPilotPanel(current, pathname);

  return GROUPS.map((group) => ({
    key: group.key,
    heading: text.groups[group.key],
    entries: group.entries.flatMap((spec): NetworkGroupEntry[] => {
      const site = visible.get(spec.site);
      if (!site) return [];
      if (spec.pilotPanel) {
        if (!signedIn) return [];
        return [
          {
            key: `${spec.site}:pilots`,
            site: spec.site,
            href: siteUrl(spec.site, PILOT_PANEL_PATH, origins),
            icon: "paperAirplane",
            name: text.pilotPanel.name,
            tagline: text.pilotPanel.tagline,
            current: panel,
          },
        ];
      }
      return [
        {
          key: site.key,
          site: site.key,
          href: site.href,
          icon: site.icon,
          name: site.name,
          tagline: site.tagline,
          current: site.current && !(site.key === "web" && panel),
        },
      ];
    }),
  })).filter((group) => group.entries.length > 0);
}

/** What the switcher's trigger reads: the page's own entry. */
export function currentEntryName(options: {
  locale: string;
  current: SiteKey;
  pathname?: string;
}): string {
  if (onPilotPanel(options.current, options.pathname)) {
    return networkText(options.locale).pilotPanel.name;
  }
  return siteLabels(options.locale)[options.current].name;
}

export interface AccountLink {
  key: "pilots" | "account";
  name: string;
  href: string;
  icon: IconName;
}

/** The account menu's links. Identical on every site. */
export function accountLinks(
  locale: string,
  origins?: SiteOrigins,
): AccountLink[] {
  const text = networkText(locale);
  return [
    {
      key: "pilots",
      name: text.pilotPanel.name,
      href: siteUrl("web", PILOT_PANEL_PATH, origins),
      icon: "paperAirplane",
    },
    {
      key: "account",
      name: text.account,
      href: siteUrl("web", ACCOUNT_PATH, origins),
      icon: "userCircle",
    },
  ];
}
