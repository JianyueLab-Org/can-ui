/**
 * "Not found" text and links, in the four locales the network ships.
 *
 * Pure: no Vue, no DOM. `NotFound.vue` renders it; a site may override any
 * string through `messages.notFound.*`.
 */
import { resolveLocale, type Locale } from "./i18n";
import { siteUrl, type SiteKey, type SiteOrigins } from "./sites";

export interface NotFoundUi {
  code: string;
  title: string;
  description: string;
  home: string;
  radar: string;
  docs: string;
}

export const NOT_FOUND_UI: Readonly<Record<Locale, NotFoundUi>> = {
  "zh-cn": {
    code: "404",
    title: "这个页面偏离了航路",
    description: "你访问的页面不存在，或者已经被移动到了别处。",
    home: "返回首页",
    radar: "打开在线地图",
    docs: "浏览文档",
  },
  "zh-tw": {
    code: "404",
    title: "這個頁面偏離了航路",
    description: "你造訪的頁面不存在，或者已經被移動到了別處。",
    home: "返回首頁",
    radar: "開啟線上地圖",
    docs: "瀏覽文件",
  },
  "en-us": {
    code: "404",
    title: "This page is off the charts",
    description:
      "The page you asked for does not exist, or it may have moved since you last flew here.",
    home: "Back to home",
    radar: "Open the radar",
    docs: "Browse the docs",
  },
  "ja-jp": {
    code: "404",
    title: "このページは航路から外れています",
    description:
      "お探しのページは存在しないか、前回のご訪問以降に移動された可能性があります。",
    home: "ホームへ戻る",
    radar: "レーダーを開く",
    docs: "ドキュメントを見る",
  },
};

/** The strings for a locale code. Anything unshipped is zh-cn. */
export function notFoundText(locale: string): NotFoundUi {
  return NOT_FOUND_UI[resolveLocale(locale)];
}

export type NotFoundLinkKey = "home" | "radar" | "docs";

export interface NotFoundLink {
  key: NotFoundLinkKey;
  href: string;
  label: string;
  variant: "primary" | "secondary" | "ghost";
}

export interface NotFoundLinksOptions {
  /** The site rendering the page. Its own network link is dropped. */
  current: SiteKey;
  locale: string;
  /** This site's root. */
  homeHref?: string;
  origins?: SiteOrigins;
}

/**
 * Home, the radar and the docs. The radar and docs links are dropped on
 * those sites, where home already points there.
 */
export function notFoundLinks({
  current,
  locale,
  homeHref = "/",
  origins,
}: NotFoundLinksOptions): NotFoundLink[] {
  const text = notFoundText(locale);
  const links: NotFoundLink[] = [
    { key: "home", href: homeHref, label: text.home, variant: "primary" },
  ];
  if (current !== "radar") {
    links.push({
      key: "radar",
      href: siteUrl("radar", undefined, origins),
      label: text.radar,
      variant: "secondary",
    });
  }
  if (current !== "docs") {
    links.push({
      key: "docs",
      href: siteUrl("docs", undefined, origins),
      label: text.docs,
      variant: "ghost",
    });
  }
  return links;
}
