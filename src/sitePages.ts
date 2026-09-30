/**
 * Every site's ⌘K entries: top-level tools and frequent tasks. No detail pages.
 *
 * Titles are copied from each site's `language/*.json`. A line ending in
 * `// proposed` had no string in that locale; replace it when the site adds one.
 *
 * Each site's `check:pages` fails when an entry here has no route in that
 * site's `src/pages`. can-docs is a VitePress site with no `src/pages` and no
 * check.
 *
 * `minRating` and `signedIn` are drawing hints, like `NetworkSite.minRating`.
 * Every site and can-api gate their own routes.
 */
import type { NetworkPage, SiteKey } from "./sites";
import { RATING_ADMIN, RATING_INSTRUCTOR, RATING_SUP } from "./ratings";

export const SITE_PAGES: Readonly<Record<SiteKey, readonly NetworkPage[]>> = {
  efb: [
    {
      key: "dashboard",
      path: "/",
      icon: "squares2x2",
      title: {
        "zh-cn": "概览",
        "zh-tw": "總覽",
        "en-us": "Overview",
        "ja-jp": "概要",
      },
      keywords: ["dashboard"],
      signedIn: true,
    },
    {
      key: "flightPlan",
      path: "/flightplan",
      icon: "paperAirplane",
      title: {
        "zh-cn": "飞行计划",
        "zh-tw": "飛行計畫",
        "en-us": "Flight plan",
        "ja-jp": "フライトプラン",
      },
      keywords: ["fpl", "simbrief"],
      signedIn: true,
    },
    {
      key: "route",
      path: "/route",
      icon: "map",
      title: {
        "zh-cn": "航路",
        "zh-tw": "航路",
        "en-us": "Route",
        "ja-jp": "ルート",
      },
      keywords: ["airway"],
      signedIn: true,
    },
    {
      key: "airports",
      path: "/airports",
      icon: "buildingOffice",
      title: {
        "zh-cn": "机场",
        "zh-tw": "機場",
        "en-us": "Airports",
        "ja-jp": "空港",
      },
      keywords: ["charts", "atis"],
      signedIn: true,
    },
  ],
  radar: [
    {
      key: "radar",
      path: "/",
      icon: "viewfinderCircle",
      title: {
        "zh-cn": "在线地图",
        "zh-tw": "線上地圖",
        "en-us": "Radar",
        "ja-jp": "レーダー",
      },
      keywords: ["map", "traffic"],
    },
  ],
  controller: [
    {
      key: "panel",
      path: "/",
      icon: "home",
      title: {
        "zh-cn": "管制员面板",
        "zh-tw": "管制員面板",
        "en-us": "ATC Panel",
        "ja-jp": "管制員パネル",
      },
      signedIn: true,
    },
    {
      key: "atis",
      path: "/atis",
      icon: "speakerWave",
      title: {
        "zh-cn": "ATIS 生成器",
        "zh-tw": "ATIS 產生器",
        "en-us": "ATIS Maker",
        "ja-jp": "ATISメーカー",
      },
      signedIn: true,
    },
    {
      key: "rules",
      path: "/rules",
      icon: "documentText",
      title: {
        "zh-cn": "管制规则",
        "zh-tw": "管制規則",
        "en-us": "ATC Rules",
        "ja-jp": "管制規則",
      },
      signedIn: true,
    },
    {
      key: "reservations",
      path: "/reservations",
      icon: "calendarDays",
      title: {
        "zh-cn": "管制预约",
        "zh-tw": "管制預約",
        "en-us": "ATC Reservations",
        "ja-jp": "管制予約",
      },
      keywords: ["booking"],
      signedIn: true,
    },
  ],
  exam: [
    {
      key: "examCentre",
      path: "/",
      icon: "academicCap",
      title: {
        "zh-cn": "考试中心",
        "zh-tw": "考試中心",
        "en-us": "Exam Centre",
        "ja-jp": "試験センター",
      },
      keywords: ["exam", "test"],
    },
    {
      key: "questionBank",
      path: "/admin",
      icon: "clipboardCheck",
      title: {
        "zh-cn": "题库管理",
        "zh-tw": "題庫管理",
        "en-us": "Question bank",
        "ja-jp": "問題バンク",
      },
      keywords: ["papers", "questions"],
      minRating: RATING_INSTRUCTOR,
      signedIn: true,
    },
  ],
  portal: [
    {
      key: "roster",
      path: "/instr/roster",
      icon: "users",
      title: {
        "zh-cn": "花名册",
        "zh-tw": "花名冊",
        "en-us": "Roster",
        "ja-jp": "名簿",
      },
      minRating: RATING_INSTRUCTOR,
      signedIn: true,
    },
    {
      key: "promotion",
      path: "/instr/promote",
      icon: "academicCap",
      title: {
        "zh-cn": "晋升",
        "zh-tw": "晉升",
        "en-us": "Promotion",
        "ja-jp": "昇格",
      },
      minRating: RATING_INSTRUCTOR,
      signedIn: true,
    },
    {
      key: "sweatbox",
      path: "/instr/sweatbox",
      icon: "computerDesktop",
      title: {
        "zh-cn": "模拟机场景",
        "zh-tw": "模擬機場景",
        "en-us": "SweatBox",
        "ja-jp": "シミュレータ・シナリオ",
      },
      keywords: ["scenario"],
      minRating: RATING_INSTRUCTOR,
      signedIn: true,
    },
    {
      key: "activitiesManage",
      path: "/super/activities",
      icon: "calendarDays",
      title: {
        "zh-cn": "活动管理",
        "zh-tw": "活動管理",
        "en-us": "Manage Activities",
        "ja-jp": "イベント管理",
      },
      minRating: RATING_SUP,
      signedIn: true,
    },
    {
      key: "prizesManage",
      path: "/super/prizes",
      icon: "gift",
      title: {
        "zh-cn": "奖品管理",
        "zh-tw": "獎品管理",
        "en-us": "Prizes",
        "ja-jp": "景品管理",
      },
      minRating: RATING_SUP,
      signedIn: true,
    },
    {
      key: "lotteryManage",
      path: "/super/lottery",
      icon: "sparkles",
      title: {
        "zh-cn": "抽奖管理",
        "zh-tw": "抽獎管理",
        "en-us": "Lottery",
        "ja-jp": "抽選管理",
      },
      minRating: RATING_SUP,
      signedIn: true,
    },
    {
      key: "feedbackManage",
      path: "/super/feedback",
      icon: "megaphone",
      title: {
        "zh-cn": "处理结果公示",
        "zh-tw": "處理結果公示",
        "en-us": "Feedback outcomes",
        "ja-jp": "対応結果の公示",
      },
      minRating: RATING_SUP,
      signedIn: true,
    },
    {
      key: "servers",
      path: "/super/servers",
      icon: "signal",
      title: {
        "zh-cn": "服务器目录",
        "zh-tw": "伺服器目錄", // proposed
        "en-us": "Server directory", // proposed
        "ja-jp": "サーバー一覧", // proposed
      },
      minRating: RATING_SUP,
      signedIn: true,
    },
    {
      key: "promotionApproval",
      path: "/super/promotions",
      icon: "checkCircle",
      title: {
        "zh-cn": "晋升审批",
        "zh-tw": "晉升審核",
        "en-us": "Promotion Approval",
        "ja-jp": "昇格承認",
      },
      minRating: RATING_SUP,
      signedIn: true,
    },
    {
      key: "aipAccess",
      path: "/super/aip-access",
      icon: "key",
      title: {
        "zh-cn": "资料库权限",
        "zh-tw": "資料庫權限",
        "en-us": "Database access",
        "ja-jp": "データベース権限",
      },
      minRating: RATING_ADMIN,
      signedIn: true,
    },
    {
      key: "developers",
      path: "/super/developers",
      icon: "commandLine",
      title: {
        "zh-cn": "开发者授权",
        "zh-tw": "開發者授權",
        "en-us": "Developer access",
        "ja-jp": "開発者権限",
      },
      minRating: RATING_ADMIN,
      signedIn: true,
    },
  ],
  web: [
    {
      key: "pilotsHome",
      path: "/pilots/",
      icon: "home",
      title: {
        "zh-cn": "个人面板",
        "zh-tw": "個人面板",
        "en-us": "Home",
        "ja-jp": "ホーム",
      },
      keywords: ["dashboard", "panel"],
      signedIn: true,
    },
    {
      key: "flightPlan",
      path: "/pilots/flightplan",
      icon: "documentText",
      title: {
        "zh-cn": "飞行计划",
        "zh-tw": "飛航計畫",
        "en-us": "Flight Plan",
        "ja-jp": "フライトプラン",
      },
      keywords: ["fpl"],
      signedIn: true,
    },
    {
      key: "flights",
      path: "/pilots/flights",
      icon: "paperAirplane",
      title: {
        "zh-cn": "飞行",
        "zh-tw": "飛行",
        "en-us": "Flights",
        "ja-jp": "フライト",
      },
      keywords: ["logbook", "history"],
      signedIn: true,
    },
    {
      key: "account",
      path: "/pilots/account",
      icon: "userCircle",
      title: {
        "zh-cn": "账号",
        "zh-tw": "帳號",
        "en-us": "Account",
        "ja-jp": "アカウント",
      },
      keywords: ["profile", "settings"],
      signedIn: true,
    },
    {
      key: "authorizedApps",
      path: "/pilots/apps",
      icon: "key",
      title: {
        "zh-cn": "已授权应用",
        "zh-tw": "已授權應用",
        "en-us": "Authorized apps",
        "ja-jp": "許可済みアプリ",
      },
      keywords: ["oauth"],
      signedIn: true,
    },
    {
      key: "roster",
      path: "/roster",
      icon: "users",
      title: {
        "zh-cn": "管制员名册",
        "zh-tw": "管制員名冊",
        "en-us": "ATC Roster",
        "ja-jp": "管制員名簿",
      },
      keywords: ["controllers"],
    },
    {
      key: "leaderboard",
      path: "/leaderboard",
      icon: "chartBar",
      title: {
        "zh-cn": "排行榜",
        "zh-tw": "排行榜",
        "en-us": "Leaderboard",
        "ja-jp": "ランキング",
      },
      keywords: ["ranking"],
      signedIn: true,
    },
    {
      key: "activities",
      path: "/activities",
      icon: "calendarDays",
      title: {
        "zh-cn": "活动",
        "zh-tw": "活動",
        "en-us": "Activities",
        "ja-jp": "イベント",
      },
      keywords: ["events"],
    },
    {
      key: "downloads",
      path: "/downloads",
      icon: "arrowDownTray",
      title: {
        "zh-cn": "软件下载",
        "zh-tw": "軟體下載",
        "en-us": "Downloads",
        "ja-jp": "ソフトウェア",
      },
      keywords: ["software", "client"],
    },
    {
      key: "rewards",
      path: "/rewards",
      icon: "gift",
      title: {
        "zh-cn": "积分兑换",
        "zh-tw": "積分兌換",
        "en-us": "Points store",
        "ja-jp": "ポイント交換",
      },
      keywords: ["points", "shop"],
    },
    {
      key: "lottery",
      path: "/lottery",
      icon: "sparkles",
      title: {
        "zh-cn": "抽奖",
        "zh-tw": "抽獎",
        "en-us": "Prize draws",
        "ja-jp": "抽選",
      },
      keywords: ["draw"],
      signedIn: true,
    },
    {
      key: "support",
      path: "/support",
      icon: "inbox",
      title: {
        "zh-cn": "问题与建议",
        "zh-tw": "問題與建議",
        "en-us": "Issues & ideas",
        "ja-jp": "不具合・ご要望",
      },
      keywords: ["bug", "report"],
    },
  ],
  docs: [
    {
      key: "regulations",
      path: "/zh_CN/regulation",
      icon: "scale",
      title: {
        "zh-cn": "平台总则",
        "zh-tw": "平台總則", // proposed
        "en-us": "Current Regulations",
        "ja-jp": "現行規程", // proposed
      },
      keywords: ["rules"],
    },
    {
      key: "atcGuidelines",
      path: "/zh_CN/atc",
      icon: "signal",
      title: {
        "zh-cn": "管制员准则",
        "zh-tw": "管制員準則", // proposed
        "en-us": "Controller Regulations",
        "ja-jp": "管制官ガイドライン", // proposed
      },
      keywords: ["controller", "conduct"],
    },
    {
      key: "revisions",
      path: "/zh_CN/revisions",
      icon: "clock",
      title: {
        "zh-cn": "修订历史与公示信息",
        "zh-tw": "修訂歷史與公示資訊", // proposed
        "en-us": "Revision History and Notices",
        "ja-jp": "改訂履歴と公示", // proposed
      },
      keywords: ["changelog"],
    },
    {
      key: "history",
      path: "/zh_CN/history",
      icon: "bookOpen",
      title: {
        "zh-cn": "平台的历史",
        "zh-tw": "平台的歷史", // proposed
        "en-us": "History",
        "ja-jp": "沿革", // proposed
      },
      keywords: ["about"],
    },
    {
      key: "privacy",
      path: "/zh_CN/privacy",
      icon: "shieldCheck",
      title: {
        "zh-cn": "隐私说明",
        "zh-tw": "隱私說明", // proposed
        "en-us": "Privacy notice",
        "ja-jp": "プライバシーについて", // proposed
      },
      keywords: ["privacy"],
    },
  ],
  dev: [
    {
      key: "myApps",
      path: "/apps",
      icon: "squaresPlus",
      title: {
        "zh-cn": "我的应用",
        "zh-tw": "我的應用程式",
        "en-us": "My applications",
        "ja-jp": "マイアプリ",
      },
      keywords: ["oauth", "clients"],
      signedIn: true,
    },
    {
      key: "apiReference",
      path: "/docs",
      icon: "commandLine",
      title: {
        "zh-cn": "接口文档",
        "zh-tw": "介面文件",
        "en-us": "API reference",
        "ja-jp": "API リファレンス",
      },
      keywords: ["api", "endpoints"],
      signedIn: true,
    },
    {
      key: "groundMaps",
      path: "/ground",
      icon: "map",
      title: {
        "zh-cn": "地面图",
        "zh-tw": "地面圖",
        "en-us": "Ground maps",
        "ja-jp": "地上図",
      },
      keywords: ["airport", "layout"],
    },
  ],
  database: [
    {
      key: "overview",
      path: "/",
      icon: "home",
      title: {
        "zh-cn": "总览",
        "zh-tw": "總覽", // proposed
        "en-us": "Overview", // proposed
        "ja-jp": "概要", // proposed
      },
      signedIn: true,
    },
    {
      key: "airports",
      path: "/airports",
      icon: "mapPin",
      title: {
        "zh-cn": "机场",
        "zh-tw": "機場", // proposed
        "en-us": "Airports", // proposed
        "ja-jp": "空港", // proposed
      },
      keywords: ["aip"],
      signedIn: true,
    },
    {
      key: "map",
      path: "/map",
      icon: "map",
      title: {
        "zh-cn": "地图",
        "zh-tw": "地圖",
        "en-us": "Map",
        "ja-jp": "地図",
      },
      signedIn: true,
    },
    {
      key: "route",
      path: "/route",
      icon: "paperAirplane",
      title: {
        "zh-cn": "航路",
        "zh-tw": "航路",
        "en-us": "Route",
        "ja-jp": "ルート",
      },
      signedIn: true,
    },
    {
      key: "positions",
      path: "/positions",
      icon: "speakerWave",
      title: {
        "zh-cn": "席位",
        "zh-tw": "席位",
        "en-us": "Positions",
        "ja-jp": "席",
      },
      signedIn: true,
    },
    {
      key: "fixes",
      path: "/fixes",
      icon: "signal",
      title: {
        "zh-cn": "航路点",
        "zh-tw": "航路點", // proposed
        "en-us": "Fixes", // proposed
        "ja-jp": "フィックス", // proposed
      },
      keywords: ["waypoints"],
      signedIn: true,
    },
    {
      key: "datasets",
      path: "/datasets",
      icon: "documentText",
      title: {
        "zh-cn": "数据集",
        "zh-tw": "資料集", // proposed
        "en-us": "Datasets", // proposed
        "ja-jp": "データセット", // proposed
      },
      signedIn: true,
    },
    {
      key: "export",
      path: "/export",
      icon: "arrowDownTray",
      title: {
        "zh-cn": "导出",
        "zh-tw": "匯出",
        "en-us": "Export",
        "ja-jp": "エクスポート",
      },
      signedIn: true,
    },
  ],
};
