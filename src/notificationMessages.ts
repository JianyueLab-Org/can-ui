/**
 * Notification text, in the four locales the network ships.
 *
 * can-ui carries these strings, as `sites.ts` carries site names: every site
 * renders the same rows, and 25 kinds × four locales × nine sites is not a
 * table to keep in step by hand. A site may still override any bell string
 * through `messages.notifications.*`, and any kind through `overrides`.
 *
 * Template syntax: `{name}` is a param. `[…]` is an optional segment, dropped
 * unless every placeholder inside has a non-empty value.
 */
import { DEFAULT_LOCALE, LOCALES, type Locale, type Translator } from "./i18n";
import {
  notificationBadgeText,
  type NotificationItem,
  type NotificationKind,
} from "./notifications";
import { ratingShort } from "./ratings";

type Messages = Readonly<Record<NotificationKind, string>>;

const ZH_CN: Messages = {
  "promotion.raised": "教员已为你提交 {toRating} 晋升申请，等待审批",
  "promotion.approved": "你的 {toRating} 晋升申请已通过[：{comment}]",
  "promotion.rejected": "你的 {toRating} 晋升申请未通过[：{comment}]",
  "rating.changed": "你的等级已由 {fromRating} 调整为 {toRating}",
  "exam.passed": "你通过了「{paper}」，得分 {score}{promoted}",
  "exam.failed": "你未通过「{paper}」，得分 {score}",
  "activity.published": "新活动「{title}」已发布，{startsAt} 开始",
  "activity.changed": "你报名的活动「{title}」有更新",
  "activity.cancelled": "你报名的活动「{title}」已取消",
  "activity.seatReleased": "你在「{title}」的 {position} 席位已被释放",
  "activity.settled": "「{title}」已结算，你获得 {points} 积分",
  "reservation.cancelledByStaff":
    "你 {startsAt} 的 {callsign} 预约已被管理人员取消",
  "lottery.won": "你在「{title}」中抽中了{prize}",
  "redemption.issued": "你兑换的{prize}已发放[：{note}]",
  "redemption.cancelled":
    "你兑换的{prize}已取消[，{points} 积分已退回][：{note}]",
  "leaderboard.credited": "{month} 排行榜奖励已到账：{points} 积分",
  "security.passwordChanged": "你的密码已修改。如非本人操作，请立即重置",
  "security.emailChanged": "你的邮箱已更改。如非本人操作，请立即联系管理人员",
  "security.newSignIn": "新设备登录：{browser} · {os} · {ipPrefix}",
  "oauth.authorized": "你已授权「{app}」访问你的账号",
  "oauth.revoked": "「{app}」的访问授权已撤销",
  "access.developerGranted": "你已获得开发者权限",
  "access.developerRevoked": "你的开发者权限已被撤销",
  "access.aipGranted": "你已获得航行资料库访问权限",
  "access.aipRevoked": "你的航行资料库访问权限已被撤销",
};

const ZH_TW: Messages = {
  "promotion.raised": "教員已為你提交 {toRating} 晉升申請，等待審核",
  "promotion.approved": "你的 {toRating} 晉升申請已通過[：{comment}]",
  "promotion.rejected": "你的 {toRating} 晉升申請未通過[：{comment}]",
  "rating.changed": "你的等級已由 {fromRating} 調整為 {toRating}",
  "exam.passed": "你通過了「{paper}」，得分 {score}{promoted}",
  "exam.failed": "你未通過「{paper}」，得分 {score}",
  "activity.published": "新活動「{title}」已發布，{startsAt} 開始",
  "activity.changed": "你報名的活動「{title}」有更新",
  "activity.cancelled": "你報名的活動「{title}」已取消",
  "activity.seatReleased": "你在「{title}」的 {position} 席位已被釋出",
  "activity.settled": "「{title}」已結算，你獲得 {points} 積分",
  "reservation.cancelledByStaff":
    "你 {startsAt} 的 {callsign} 預約已被管理人員取消",
  "lottery.won": "你在「{title}」中抽中了{prize}",
  "redemption.issued": "你兌換的{prize}已發放[：{note}]",
  "redemption.cancelled":
    "你兌換的{prize}已取消[，{points} 積分已退回][：{note}]",
  "leaderboard.credited": "{month} 排行榜獎勵已入帳：{points} 積分",
  "security.passwordChanged": "你的密碼已修改。如非本人操作，請立即重設",
  "security.emailChanged":
    "你的電子郵件已變更。如非本人操作，請立即聯絡管理人員",
  "security.newSignIn": "新裝置登入：{browser} · {os} · {ipPrefix}",
  "oauth.authorized": "你已授權「{app}」存取你的帳號",
  "oauth.revoked": "「{app}」的存取授權已撤銷",
  "access.developerGranted": "你已獲得開發者權限",
  "access.developerRevoked": "你的開發者權限已被撤銷",
  "access.aipGranted": "你已獲得航行資料庫存取權限",
  "access.aipRevoked": "你的航行資料庫存取權限已被撤銷",
};

const EN_US: Messages = {
  "promotion.raised":
    "An instructor has put you forward for {toRating}. Awaiting approval.",
  "promotion.approved":
    "Your promotion to {toRating} was approved[: {comment}]",
  "promotion.rejected":
    "Your promotion to {toRating} was not approved[: {comment}]",
  "rating.changed": "Your rating changed from {fromRating} to {toRating}",
  "exam.passed": "You passed “{paper}” with a score of {score}{promoted}",
  "exam.failed": "You did not pass “{paper}” (score {score})",
  "activity.published": "New event “{title}” starts {startsAt}",
  "activity.changed": "“{title}”, which you signed up for, has been updated",
  "activity.cancelled":
    "“{title}”, which you signed up for, has been cancelled",
  "activity.seatReleased":
    "Your {position} seat at “{title}” has been released",
  "activity.settled": "“{title}” has been settled: you earned {points} points",
  "reservation.cancelledByStaff":
    "Staff cancelled your {callsign} booking for {startsAt}",
  "lottery.won": "You won {prize} in “{title}”",
  "redemption.issued": "Your {prize} has been issued[: {note}]",
  "redemption.cancelled":
    "Your {prize} redemption was cancelled[ and {points} points were refunded][: {note}]",
  "leaderboard.credited": "Leaderboard reward for {month}: {points} points",
  "security.passwordChanged":
    "Your password was changed. If this wasn't you, reset it now.",
  "security.emailChanged":
    "Your email address was changed. If this wasn't you, contact staff now.",
  "security.newSignIn": "New sign-in: {browser} on {os}, {ipPrefix}",
  "oauth.authorized": "You authorised “{app}” to access your account",
  "oauth.revoked": "Access for “{app}” was revoked",
  "access.developerGranted": "You now have developer access",
  "access.developerRevoked": "Your developer access was revoked",
  "access.aipGranted": "You now have access to the aeronautical database",
  "access.aipRevoked": "Your access to the aeronautical database was revoked",
};

const JA_JP: Messages = {
  "promotion.raised":
    "教官があなたの {toRating} 昇格を申請しました。承認待ちです",
  "promotion.approved": "{toRating} への昇格が承認されました[：{comment}]",
  "promotion.rejected":
    "{toRating} への昇格は承認されませんでした[：{comment}]",
  "rating.changed":
    "レーティングが {fromRating} から {toRating} に変更されました",
  "exam.passed": "「{paper}」に合格しました（{score} 点）{promoted}",
  "exam.failed": "「{paper}」は不合格でした（{score} 点）",
  "activity.published":
    "新しいイベント「{title}」が公開されました。{startsAt} 開始",
  "activity.changed": "申し込んだイベント「{title}」が更新されました",
  "activity.cancelled": "申し込んだイベント「{title}」は中止になりました",
  "activity.seatReleased": "「{title}」の {position} 席が解放されました",
  "activity.settled": "「{title}」が精算され、{points} ポイントを獲得しました",
  "reservation.cancelledByStaff":
    "{startsAt} の {callsign} 予約がスタッフにより取り消されました",
  "lottery.won": "「{title}」で {prize} が当選しました",
  "redemption.issued": "交換した {prize} が発行されました[：{note}]",
  "redemption.cancelled":
    "{prize} の交換が取り消されました[。{points} ポイントが返還されました][：{note}]",
  "leaderboard.credited": "{month} のランキング報酬：{points} ポイント",
  "security.passwordChanged":
    "パスワードが変更されました。心当たりがない場合はすぐに再設定してください",
  "security.emailChanged":
    "メールアドレスが変更されました。心当たりがない場合はすぐにスタッフへ連絡してください",
  "security.newSignIn":
    "新しい端末からのサインイン：{browser} · {os} · {ipPrefix}",
  "oauth.authorized": "「{app}」にアカウントへのアクセスを許可しました",
  "oauth.revoked": "「{app}」のアクセス許可を取り消しました",
  "access.developerGranted": "開発者権限が付与されました",
  "access.developerRevoked": "開発者権限が取り消されました",
  "access.aipGranted": "航空情報データベースへのアクセス権が付与されました",
  "access.aipRevoked": "航空情報データベースへのアクセス権が取り消されました",
};

export const NOTIFICATION_MESSAGES: Readonly<Record<Locale, Messages>> = {
  "zh-cn": ZH_CN,
  "zh-tw": ZH_TW,
  "en-us": EN_US,
  "ja-jp": JA_JP,
};

/** The bell's own strings. Read as `notifications.<key>`. */
export interface NotificationUi {
  /** Trigger and Me-sheet row, count 0. */
  label: string;
  /** Trigger `aria-label` with a count. */
  labelCount: string;
  /** Panel heading and dialog name. */
  title: string;
  markAllRead: string;
  loadMore: string;
  empty: string;
  loadFailed: string;
  retry: string;
  /** Me sheet: back to the menu. */
  back: string;
  /** Screen-reader text on the unread dot. */
  unread: string;
  /** Live region text. */
  announce: string;
  /** A kind this release does not know. */
  generic: string;
  /** Appended by `exam.passed` when `promoted` is true. */
  promoted: string;
}

export const NOTIFICATION_UI: Readonly<Record<Locale, NotificationUi>> = {
  "zh-cn": {
    label: "通知",
    labelCount: "通知，{count} 条未读",
    title: "通知",
    markAllRead: "全部标为已读",
    loadMore: "加载更多",
    empty: "暂无通知",
    loadFailed: "通知加载失败",
    retry: "重试",
    back: "返回",
    unread: "未读",
    announce: "{count} 条未读通知",
    generic: "你有一条新通知",
    promoted: "，等级已晋升",
  },
  "zh-tw": {
    label: "通知",
    labelCount: "通知，{count} 則未讀",
    title: "通知",
    markAllRead: "全部標為已讀",
    loadMore: "載入更多",
    empty: "目前沒有通知",
    loadFailed: "通知載入失敗",
    retry: "重試",
    back: "返回",
    unread: "未讀",
    announce: "{count} 則未讀通知",
    generic: "你有一則新通知",
    promoted: "，等級已晉升",
  },
  "en-us": {
    label: "Notifications",
    labelCount: "Notifications, {count} unread",
    title: "Notifications",
    markAllRead: "Mark all read",
    loadMore: "Load more",
    empty: "No notifications",
    loadFailed: "Couldn't load notifications",
    retry: "Retry",
    back: "Back",
    unread: "Unread",
    announce: "{count} unread notifications",
    generic: "You have a new notification",
    promoted: "; your rating has been raised",
  },
  "ja-jp": {
    label: "通知",
    labelCount: "通知、未読 {count} 件",
    title: "通知",
    markAllRead: "すべて既読にする",
    loadMore: "さらに読み込む",
    empty: "通知はありません",
    loadFailed: "通知を読み込めませんでした",
    retry: "再試行",
    back: "戻る",
    unread: "未読",
    announce: "未読の通知 {count} 件",
    generic: "新しい通知があります",
    promoted: "。レーティングが昇格しました",
  },
};

/** A locale code resolved to a shipped locale. Anything else is zh-cn. */
export function notificationLocale(locale: string): Locale {
  return (LOCALES as readonly string[]).includes(locale)
    ? (locale as Locale)
    : DEFAULT_LOCALE;
}

/** The fallback dictionary a bell component hands `createTranslator`. */
export function notificationChrome(locale: string): {
  notifications: NotificationUi;
} {
  return { notifications: NOTIFICATION_UI[notificationLocale(locale)] };
}

export interface RenderNotificationOptions {
  /** For tests. Defaults to the browser's zone. */
  timeZone?: string;
}

const PLACEHOLDER = /\{(\w+)\}/g;
const SEGMENT = /\[([^[\]]*)\]/g;

function formatParam(
  key: string,
  value: unknown,
  locale: Locale,
  options: RenderNotificationOptions,
): string | undefined {
  if (key === "promoted") {
    return value === true ? NOTIFICATION_UI[locale].promoted : "";
  }
  if (value === undefined || value === null) return undefined;
  if (
    (key === "fromRating" || key === "toRating") &&
    typeof value === "number"
  ) {
    return ratingShort(value);
  }
  if (key === "startsAt" && typeof value === "string") {
    const time = Date.parse(value);
    if (Number.isNaN(time)) return value;
    return new Intl.DateTimeFormat(locale, {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: options.timeZone,
    }).format(time);
  }
  if (
    key === "month" &&
    typeof value === "string" &&
    /^\d{4}-\d{2}$/.test(value)
  ) {
    const time = Date.parse(`${value}-01T00:00:00Z`);
    if (Number.isNaN(time)) return value;
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "long",
      timeZone: "UTC",
    }).format(time);
  }
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  return undefined;
}

function fill(
  template: string,
  values: Readonly<Record<string, string | undefined>>,
): string {
  return template
    .replace(SEGMENT, (_, inner: string) =>
      [...inner.matchAll(PLACEHOLDER)].every(
        (match) => Object.hasOwn(values, match[1]!) && values[match[1]!],
      )
        ? inner
        : "",
    )
    .replace(
      PLACEHOLDER,
      (_, key: string) =>
        (Object.hasOwn(values, key) ? values[key] : undefined) ?? `{${key}}`,
    );
}

function own(
  table: Readonly<Record<string, string>> | undefined,
  key: string,
): string | undefined {
  return table && Object.hasOwn(table, key) ? table[key] : undefined;
}

/**
 * A row's text. `overrides` (kind → template) wins, then the locale's
 * message, then zh-cn's. An unknown kind renders the generic line.
 */
export function renderNotification(
  item: Pick<NotificationItem, "kind" | "params">,
  locale: string,
  overrides?: Readonly<Record<string, string>>,
  options: RenderNotificationOptions = {},
): string {
  const lang = notificationLocale(locale);
  const template =
    own(overrides, item.kind) ??
    own(NOTIFICATION_MESSAGES[lang], item.kind) ??
    own(NOTIFICATION_MESSAGES[DEFAULT_LOCALE], item.kind);
  if (template === undefined) return NOTIFICATION_UI[lang].generic;

  const params =
    item.params && typeof item.params === "object" ? item.params : {};
  const values: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(params)) {
    values[key] = formatParam(key, value, lang, options);
  }
  if (!Object.hasOwn(values, "promoted")) {
    values.promoted = formatParam("promoted", undefined, lang, options);
  }
  return fill(template, values);
}

/** The trigger's accessible name: the label, with the unread count when there is one. */
export function notificationLabel(t: Translator, count: number): string {
  const badge = notificationBadgeText(count);
  return badge
    ? t("notifications.labelCount", { count: badge })
    : t("notifications.label");
}

/** The polite live-region text for a changed count; empty when none has changed. */
export function notificationAnnouncement(
  t: Translator,
  value: number | null,
): string {
  return value === null
    ? ""
    : t("notifications.announce", {
        count: notificationBadgeText(value) || "0",
      });
}
