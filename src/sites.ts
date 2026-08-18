/**
 * The network's own map of itself — every CAN site, in one place.
 *
 * ## Why this is in can-ui and not in each site
 *
 * Before this module, "which sites exist and how do I link to one" was written
 * down independently in can-web, can-controller, can-portal and can-efb, and
 * not written down at all in can-exam, can-dev and can-radar. The result was
 * measurable rather than theoretical: the exam centre linked to exactly one
 * other site, the radar — the most public page on the network — linked to
 * none, and the section switcher offered three destinations out of nine.
 *
 * A member who wanted the flight bag from the radar had to know the hostname.
 *
 * One copy per site is how that happens. Nine hosts have to agree about what
 * the network contains, and agreement maintained by hand across nine
 * repositories is agreement that decays — each site drifts on the day someone
 * adds a page to it and to nowhere else. This is the same problem
 * `ThemeLangControls` had before it was lifted here, and the same fix.
 *
 * ## Why the labels are here too
 *
 * This is a deliberate exception to the rule in `i18n.ts` — *the site owns the
 * dictionaries, can-ui only knows how to read one* — and it is worth stating
 * why, because the rule is a good one.
 *
 * These strings name **can-ui's peers**. "在线雷达" is not a phrase the radar
 * gets to write differently from the way the exam centre writes it: it is the
 * network's name for one of its own components, the way `LANGUAGES` carries
 * each language's endonym rather than asking every site to spell 日本語. Push
 * them out to the sites and there are nine names × four locales × seven sites
 * to keep in step, which is 252 strings maintained by memory. The first one to
 * drift is the one nobody notices.
 *
 * The rule still holds for everything a site says about *itself* — its own
 * page names, its own copy. That stays in the site's dictionary.
 *
 * ## What this module does not do
 *
 * It does not decide what a member may see. `minRating` is a **hint for
 * drawing a menu**, not an authorization boundary: the sites listed here check
 * their own sessions, and can-api checks every route behind them. Its only job
 * is to keep a link out of a menu when following it would certainly end in a
 * 403 — the same rule can-controller's `nav.ts` states for its instructor
 * group. Removing an entry from a menu protects nothing; adding one grants
 * nothing.
 */

/** Every site in the network. Keys are stable — sites store them. */
export type SiteKey =
  | "web"
  | "controller"
  | "exam"
  | "portal"
  | "efb"
  | "radar"
  | "dev"
  | "docs"
  | "database";

/**
 * Which column of the footer an entry belongs to.
 *
 * Three groups, chosen so a member can find a site by *what they are doing*
 * rather than by which repository happens to serve it: `flight` is what a
 * pilot opens, `atc` is what a controller opens, `network` is everything that
 * belongs to neither seat.
 */
export type SiteSection = "flight" | "atc" | "network";

export interface NetworkSite {
  key: SiteKey;
  /** Scheme + host, no trailing slash. Paths are appended by the caller. */
  origin: string;
  /** Path on that origin the entry points at. Always starts with "/". */
  path: string;
  /** ICON_PATHS key. */
  icon: string;
  section: SiteSection;
  /**
   * Hide the entry below this rating. A drawing hint, never a guard — see the
   * module comment. Absent means every signed-in member; see `publicSite` for
   * the ones that do not even need that.
   */
  minRating?: number;
  /** Reachable without signing in — decides what an anonymous visitor sees. */
  publicSite?: boolean;
}

/**
 * Rating floors, named.
 *
 * Copied from can-web's `ratingTrans`, like every other consumer. If a level
 * above ADM is ever added, this is one of the places that has to hear about
 * it — can-controller's `nav.ts` carries the same warning about the same two
 * numbers.
 */
export const RATING_INSTRUCTOR = 8;
export const RATING_ADMIN = 12;

/**
 * The nine sites.
 *
 * Origins are hardcoded, exactly as they were in every copy this replaces:
 * they are hostnames rather than secrets, and this module is imported by
 * browser islands where reading `process.env` throws.
 *
 * Declaration order is the order they render in. It runs flight → ATC →
 * network rather than alphabetically or by age, because that is the order a
 * member's day runs in.
 */
export const NETWORK_SITES: readonly NetworkSite[] = [
  {
    key: "web",
    origin: "https://ceruleanavi.net",
    path: "/pilots",
    icon: "paperAirplane",
    section: "flight",
  },
  {
    key: "efb",
    origin: "https://efb.ceruleanavi.net",
    path: "/",
    icon: "map",
    section: "flight",
  },
  {
    key: "radar",
    origin: "https://radar.ceruleanavi.net",
    path: "/",
    icon: "mapPin",
    section: "flight",
    publicSite: true,
  },
  {
    key: "controller",
    origin: "https://controller.ceruleanavi.net",
    path: "/",
    icon: "signal",
    section: "atc",
  },
  {
    key: "exam",
    origin: "https://exam.ceruleanavi.net",
    path: "/",
    icon: "academicCap",
    section: "atc",
  },
  {
    key: "portal",
    origin: "https://portal.ceruleanavi.net",
    path: "/instr/roster",
    icon: "shieldCheck",
    section: "atc",
    minRating: RATING_INSTRUCTOR,
  },
  {
    key: "docs",
    origin: "https://docs.ceruleanavi.net",
    path: "/",
    icon: "bookOpen",
    section: "network",
    publicSite: true,
  },
  {
    key: "dev",
    origin: "https://platform.ceruleanavi.net",
    path: "/docs",
    icon: "commandLine",
    section: "network",
    publicSite: true,
  },
  {
    key: "database",
    origin: "https://database.ceruleanavi.net",
    path: "/",
    icon: "globeAlt",
    section: "network",
    minRating: RATING_ADMIN,
  },
];

/**
 * The three sites the section switcher already covers.
 *
 * A header that draws the switcher passes these to `NetworkMenu` as `exclude`,
 * so the menu is the *complement* of the switcher rather than a second copy of
 * it. Listing a destination twice in one bar does not make it easier to find;
 * it makes the bar longer.
 */
export const WORKSPACE_SITE_KEYS: readonly SiteKey[] = [
  "web",
  "controller",
  "exam",
];

/**
 * Where the community actually talks, and where the code is.
 *
 * Network-wide constants for the same reason the site names are: they were
 * copied by hand into can-web's footer and can-dev's, and **both copies of the
 * GitHub URL contained a space** — `https://github.com/Cerulean Aviation
 * Network/`, the wreckage of the AirwaySN rename, shipped on every page of two
 * sites because nothing type-checks a string that happens to be a URL.
 */
export interface CommunityLink {
  key: "github" | "bilibili" | "qq" | "discord";
  href: string;
}

export const COMMUNITY_LINKS: readonly CommunityLink[] = [
  { key: "github", href: "https://github.com/JianyueLab-Org" },
  { key: "bilibili", href: "https://space.bilibili.com/3546824224803315" },
  {
    key: "qq",
    href: "https://qm.qq.com/cgi-bin/qm/qr?k=Y11e185GOAgYhI6_M9lOLOvmz2YArvTG&jump_from=webapi&authKey=riivLLjWMo16LUdNtmZegWp/E4p8Uhuf2A63aYD1SZckDV+6A1AUAUJDOD8wsLn2",
  },
  { key: "discord", href: "https://discord.gg/uWxEtNEVp9" },
];

/** Indexed lookup, for the common case of "where does this key live". */
export const SITE_BY_KEY: Readonly<Record<SiteKey, NetworkSite>> =
  Object.fromEntries(NETWORK_SITES.map((s) => [s.key, s])) as Record<
    SiteKey,
    NetworkSite
  >;

/** Absolute URL of a path on another site. `siteUrl("docs", "/zh_CN/atc")`. */
export function siteUrl(key: SiteKey, path?: string): string {
  const site = SITE_BY_KEY[key];
  return `${site.origin}${path ?? site.path}`;
}

export interface SiteLabel {
  /** The site's name. Shown in the menu, the footer and the palette. */
  name: string;
  /**
   * A handful of characters saying what is *in* it.
   *
   * Not decoration. `nav.ts` states the rule these exist to serve — name every
   * entry for what is in it — and a list of nine product names fails it: a
   * member who has never opened the flight bag cannot tell from "电子飞行包"
   * whether their flight plan is in there. The tagline is where that answer
   * goes.
   */
  tagline: string;
}

type LabelTable = Readonly<Record<SiteKey, SiteLabel>>;

const ZH_CN: LabelTable = {
  web: { name: "飞行员面板", tagline: "飞行记录与积分" },
  efb: { name: "电子飞行包", tagline: "飞行计划与气象" },
  radar: { name: "在线雷达", tagline: "实时在线流量" },
  controller: { name: "管制员中心", tagline: "ATIS 与席位预约" },
  exam: { name: "考试中心", tagline: "理论考试与培训" },
  portal: { name: "教员与管理门户", tagline: "花名册与晋升" },
  docs: { name: "会员文档", tagline: "规章与行为准则" },
  dev: { name: "开发者中心", tagline: "接口文档与应用" },
  database: { name: "航行资料库", tagline: "机场与航路数据" },
};

const ZH_TW: LabelTable = {
  web: { name: "飛行員面板", tagline: "飛行記錄與積分" },
  efb: { name: "電子飛行包", tagline: "飛行計畫與氣象" },
  radar: { name: "線上雷達", tagline: "即時線上流量" },
  controller: { name: "管制員中心", tagline: "ATIS 與席位預約" },
  exam: { name: "考試中心", tagline: "理論考試與培訓" },
  portal: { name: "教員與管理入口", tagline: "花名冊與晉升" },
  docs: { name: "會員文件", tagline: "規章與行為準則" },
  dev: { name: "開發者中心", tagline: "介面文件與應用" },
  database: { name: "航行資料庫", tagline: "機場與航路資料" },
};

const EN_US: LabelTable = {
  web: { name: "Pilot Panel", tagline: "Logbook and points" },
  efb: { name: "Flight Bag", tagline: "Flight plans and weather" },
  radar: { name: "Live Radar", tagline: "Traffic online now" },
  controller: { name: "Controller Centre", tagline: "ATIS and bookings" },
  exam: { name: "Exam Centre", tagline: "Theory exams and training" },
  portal: { name: "Staff Portal", tagline: "Roster and promotions" },
  docs: { name: "Documentation", tagline: "Regulations and conduct" },
  dev: { name: "Developer Centre", tagline: "API reference and apps" },
  database: { name: "Aeronautical Data", tagline: "Airports and airways" },
};

const JA_JP: LabelTable = {
  web: { name: "パイロットパネル", tagline: "飛行記録とポイント" },
  efb: { name: "電子フライトバッグ", tagline: "飛行計画と気象" },
  radar: { name: "オンラインレーダー", tagline: "リアルタイム交通" },
  controller: { name: "管制官センター", tagline: "ATIS と席予約" },
  exam: { name: "試験センター", tagline: "学科試験と訓練" },
  portal: { name: "教官・管理ポータル", tagline: "名簿と昇格" },
  docs: { name: "会員ドキュメント", tagline: "規程と行動規範" },
  dev: { name: "開発者センター", tagline: "API リファレンスとアプリ" },
  database: { name: "航空情報データベース", tagline: "空港と航路データ" },
};

/**
 * Labels by locale code — the same four codes `LANGUAGES` carries.
 *
 * English is the fallback for an unknown code rather than Chinese, matching
 * `CHROME_MESSAGES`: a site passing a locale this package has not heard of is
 * a site running ahead of its can-ui, and English is the one every operator
 * here reads.
 */
export const SITE_LABELS: Readonly<Record<string, LabelTable>> = {
  "zh-cn": ZH_CN,
  "zh-tw": ZH_TW,
  "en-us": EN_US,
  "ja-jp": JA_JP,
};

export function siteLabels(locale: string): LabelTable {
  return SITE_LABELS[locale] ?? EN_US;
}

/**
 * The footer's column headings, and the one line under the mark.
 *
 * Here for the same reason the site names are — they name the network's own
 * structure, and a footer that says 飞行 on one host and 飞行员 on the next is
 * the drift this module exists to stop. Note the headings name a **seat**, not
 * a repository: a member looks for the flight bag under "飞行", not under
 * "can-efb".
 */
export interface SectionHeadings {
  flight: string;
  atc: string;
  network: string;
  community: string;
  /** One sentence under the logo. */
  description: string;
}

const HEADINGS: Readonly<Record<string, SectionHeadings>> = {
  "zh-cn": {
    flight: "飞行",
    atc: "管制",
    network: "网络",
    community: "社区",
    description: "Cerulean Aviation Network —— 面向飞行模拟爱好者的空管网络。",
  },
  "zh-tw": {
    flight: "飛行",
    atc: "管制",
    network: "網路",
    community: "社群",
    description: "Cerulean Aviation Network —— 面向飛行模擬愛好者的空管網路。",
  },
  "en-us": {
    flight: "Flying",
    atc: "Controlling",
    network: "Network",
    community: "Community",
    description:
      "Cerulean Aviation Network — an air traffic control network for flight simulation.",
  },
  "ja-jp": {
    flight: "フライト",
    atc: "管制",
    network: "ネットワーク",
    community: "コミュニティ",
    description:
      "Cerulean Aviation Network —— フライトシミュレーションのための航空管制ネットワーク。",
  },
};

export function sectionHeadings(locale: string): SectionHeadings {
  return HEADINGS[locale] ?? HEADINGS["en-us"];
}

/**
 * Community link names.
 *
 * GitHub and Discord are proper nouns and are not translated in any locale —
 * writing them out per locale anyway would invite somebody to "translate" one.
 * Only the two that genuinely differ carry variants.
 */
const COMMUNITY_LABELS: Readonly<Record<string, Record<string, string>>> = {
  "zh-cn": {
    github: "GitHub",
    bilibili: "哔哩哔哩",
    qq: "QQ 群",
    discord: "Discord",
  },
  "zh-tw": {
    github: "GitHub",
    bilibili: "嗶哩嗶哩",
    qq: "QQ 群",
    discord: "Discord",
  },
  "en-us": {
    github: "GitHub",
    bilibili: "Bilibili",
    qq: "QQ Group",
    discord: "Discord",
  },
  "ja-jp": {
    github: "GitHub",
    bilibili: "ビリビリ",
    qq: "QQ グループ",
    discord: "Discord",
  },
};

/** Community links, named in the member's locale. */
export function communityLinks(
  locale: string,
): Array<{ key: string; href: string; name: string }> {
  const labels = COMMUNITY_LABELS[locale] ?? COMMUNITY_LABELS["en-us"];
  return COMMUNITY_LINKS.map((link) => ({
    key: link.key,
    href: link.href,
    name: labels[link.key] ?? link.key,
  }));
}

/** One site's label in one locale. */
export function siteLabel(locale: string, key: SiteKey): SiteLabel {
  return siteLabels(locale)[key];
}

/** A resolved entry, ready to render: absolute href plus localized text. */
export interface ResolvedSite extends SiteLabel {
  key: SiteKey;
  href: string;
  icon: string;
  section: SiteSection;
  /** True when this entry is the site the member is looking at. */
  current: boolean;
}

export interface SiteListOptions {
  /** Locale code, e.g. `zh-cn`. */
  locale: string;
  /** The site doing the rendering, so it can mark or drop itself. */
  current?: SiteKey;
  /** Session rating, for the `minRating` hint. Absent = treated as signed out. */
  rating?: number;
  /** Whether anybody is signed in. Absent/false hides members-only entries. */
  signedIn?: boolean;
  /** Drop the current site. A switcher wants it marked; a footer wants it gone. */
  excludeCurrent?: boolean;
}

/**
 * The sites worth showing this member, in declaration order.
 *
 * **A missing rating hides more, not less** — the same choice can-controller's
 * `nav.ts` makes, and for the same reason: a session whose rating did not
 * resolve should see fewer things rather than a menu of links that 403. The
 * `typeof` check is deliberate; `undefined >= 8` being false is luck rather
 * than intent.
 */
export function visibleSites(options: SiteListOptions): ResolvedSite[] {
  const { locale, current, rating, signedIn = false, excludeCurrent } = options;
  const labels = siteLabels(locale);

  return NETWORK_SITES.filter((site) => {
    if (excludeCurrent && site.key === current) return false;
    if (site.publicSite) return true;
    if (!signedIn) return false;
    if (site.minRating === undefined) return true;
    return typeof rating === "number" && rating >= site.minRating;
  }).map((site) => ({
    key: site.key,
    href: siteUrl(site.key),
    icon: site.icon,
    section: site.section,
    current: site.key === current,
    ...labels[site.key],
  }));
}

/** The same list, grouped into the footer's three columns, empty ones dropped. */
export function sitesBySection(
  options: SiteListOptions,
): Array<{ section: SiteSection; sites: ResolvedSite[] }> {
  const all = visibleSites(options);
  return (["flight", "atc", "network"] as const)
    .map((section) => ({
      section,
      sites: all.filter((s) => s.section === section),
    }))
    .filter((group) => group.sites.length > 0);
}
