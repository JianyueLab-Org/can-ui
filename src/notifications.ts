/**
 * Network notifications — the pure half of the bell.
 *
 * can-api stores `kind` and `params`, not text. `NOTIFICATION_KINDS` copies
 * can-api's Go constants; `NOTIFICATION_PARAMS` names each kind's params.
 * `notificationMessages.ts` renders them. See AGENTS.md → Notifications.
 */
import { DEFAULT_LOCALE, LOCALES } from "./i18n";
import type { IconName } from "./icons";
import { SITE_BY_KEY, siteUrl, type SiteKey, type SiteOrigins } from "./sites";

export const NOTIFICATION_KINDS = [
  "promotion.raised",
  "promotion.approved",
  "promotion.rejected",
  "rating.changed",
  "exam.passed",
  "exam.failed",
  "activity.published",
  "activity.changed",
  "activity.cancelled",
  "activity.seatReleased",
  "activity.settled",
  "reservation.cancelledByStaff",
  "lottery.won",
  "redemption.issued",
  "redemption.cancelled",
  "leaderboard.credited",
  "security.passwordChanged",
  "security.emailChanged",
  "security.newSignIn",
  "oauth.authorized",
  "oauth.revoked",
  "access.developerGranted",
  "access.developerRevoked",
  "access.aipGranted",
  "access.aipRevoked",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

/** Each kind's `params` keys. `comment`, `note` and `redemption.cancelled`'s `points` are optional. */
export const NOTIFICATION_PARAMS: Readonly<
  Record<NotificationKind, readonly string[]>
> = {
  "promotion.raised": ["toRating"],
  "promotion.approved": ["toRating", "comment"],
  "promotion.rejected": ["toRating", "comment"],
  "rating.changed": ["fromRating", "toRating"],
  "exam.passed": ["paper", "score", "promoted"],
  "exam.failed": ["paper", "score"],
  "activity.published": ["activityId", "title", "startsAt"],
  "activity.changed": ["activityId", "title"],
  "activity.cancelled": ["activityId", "title"],
  "activity.seatReleased": ["activityId", "title", "position"],
  "activity.settled": ["activityId", "title", "points"],
  "reservation.cancelledByStaff": ["callsign", "startsAt"],
  "lottery.won": ["lotteryId", "title", "prize"],
  "redemption.issued": ["prize", "note"],
  "redemption.cancelled": ["prize", "points", "note"],
  "leaderboard.credited": ["month", "points"],
  "security.passwordChanged": [],
  "security.emailChanged": [],
  "security.newSignIn": ["browser", "os", "ipPrefix"],
  "oauth.authorized": ["app"],
  "oauth.revoked": ["app"],
  "access.developerGranted": [],
  "access.developerRevoked": [],
  "access.aipGranted": [],
  "access.aipRevoked": [],
};

export type NotificationSource = "member" | "broadcast";

/** One row of `GET /api/v1/notifications`. */
export interface NotificationItem {
  id: number;
  source: NotificationSource;
  kind: string;
  params: Record<string, unknown>;
  /** A `SiteKey`. */
  site: string;
  path: string;
  /** RFC3339. */
  createdAt: string;
  read: boolean;
}

export interface NotificationPage {
  items: NotificationItem[];
  /** Opaque cursor; pass back as `before`. */
  next: string | null;
}

export const NOTIFICATIONS_PATH = "/api/v1/notifications";
export const NOTIFICATIONS_UNREAD_PATH = `${NOTIFICATIONS_PATH}/unread`;
export const NOTIFICATIONS_READ_ALL_PATH = `${NOTIFICATIONS_PATH}/read-all`;
export const NOTIFICATIONS_PAGE_SIZE = 20;

export function notificationsListPath(
  before?: string | null,
  limit: number = NOTIFICATIONS_PAGE_SIZE,
): string {
  const query = new URLSearchParams();
  if (before) query.set("before", before);
  query.set("limit", String(limit));
  return `${NOTIFICATIONS_PATH}?${query.toString()}`;
}

export function notificationReadPath(
  source: NotificationSource,
  id: number,
): string {
  return `${NOTIFICATIONS_PATH}/${source}/${id}`;
}

/** A site-relative path, or `/`. Blocks `//host`, `/\host` and absolute URLs. */
function sitePath(path: string): string {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\")
    ? path
    : "/";
}

/**
 * Where a row links. Same site: the path. Other sites: the full origin,
 * with `origins` overrides. An unknown `site` has no link.
 */
export function notificationHref(
  item: Pick<NotificationItem, "site" | "path">,
  current: SiteKey,
  origins?: SiteOrigins,
): string | null {
  if (!Object.hasOwn(SITE_BY_KEY, item.site)) return null;
  const path = sitePath(item.path);
  return item.site === current
    ? path
    : siteUrl(item.site as SiteKey, path, origins);
}

const CATEGORY_ICONS: Readonly<Record<string, IconName>> = {
  promotion: "star",
  rating: "star",
  exam: "academicCap",
  activity: "calendarDays",
  reservation: "clock",
  lottery: "gift",
  redemption: "gift",
  leaderboard: "chartBar",
  security: "shieldCheck",
  oauth: "key",
  access: "key",
};

/** The category icon: the part of `kind` before the first dot. */
export function notificationIcon(kind: string): IconName {
  const category = kind.split(".")[0] ?? "";
  return Object.hasOwn(CATEGORY_ICONS, category)
    ? CATEGORY_ICONS[category]!
    : "bell";
}

/** Badge text. can-api caps the count at 99, so 99 reads as `99+`. */
export function notificationBadgeText(count: number): string {
  if (count <= 0) return "";
  return count >= 99 ? "99+" : String(count);
}

function intlLocale(locale: string): string {
  return (LOCALES as readonly string[]).includes(locale)
    ? locale
    : DEFAULT_LOCALE;
}

/** "now", "5 minutes ago", "yesterday" within a week; a short date after. */
export function notificationTime(
  iso: string,
  now: number,
  locale: string,
): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "";
  const lang = intlLocale(locale);
  // A createdAt ahead of this clock is skew, not the future.
  const seconds = Math.min((then - now) / 1000, 0);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  if (abs < 60) return rtf.format(0, "second");
  if (abs < 3600) return rtf.format(Math.trunc(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.trunc(seconds / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.trunc(seconds / 86400), "day");
  return new Intl.DateTimeFormat(lang, {
    month: "short",
    day: "numeric",
  }).format(then);
}
