<script setup lang="ts">
/**
 * CanFrame in each layout. Query: `layout`, `signedIn`, `denied`,
 * `bell` (`on` · `empty` · `off`).
 * Mounted client-only: the layout comes from the URL.
 * The bell reads fixtures through NOTIFICATION_FETCH_KEY: 8 rows, 5 per page.
 */
import { computed, onMounted, provide, ref } from "vue";
import CanFrame from "../components/CanFrame.vue";
import NoAccess from "../components/NoAccess.vue";
import { NOTIFICATION_FETCH_KEY } from "../composables/useNotifications";
import type { FrameLayout, FrameUser } from "../frame";
import type { NavChild, NavItem, Workspace } from "../nav";
import type { NotificationItem } from "../notifications";

type BellMode = "on" | "empty" | "off";
const BELL_MODES: BellMode[] = ["on", "empty", "off"];

const profileItems: NavChild[] = [
  { name: "账号", href: "#account", icon: "userCircle" },
];

const LAYOUTS: FrameLayout[] = ["content", "tool", "rail", "map"];

const layout = ref<FrameLayout>("content");
const signedIn = ref(true);
const denied = ref(false);
const bell = ref<BellMode>("on");

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("layout");
  if (requested && (LAYOUTS as string[]).includes(requested)) {
    layout.value = requested as FrameLayout;
  }
  signedIn.value = params.get("signedIn") !== "0";
  denied.value = params.get("denied") === "1";
  const mode = params.get("bell");
  if (mode && (BELL_MODES as string[]).includes(mode)) {
    bell.value = mode as BellMode;
  }
});

/* Notification fixtures ---------------------------------------------------- */
const minutesAgo = (minutes: number) =>
  new Date(Date.now() - minutes * 60_000).toISOString();

const fixtures: NotificationItem[] = [
  {
    id: 41,
    source: "member",
    kind: "promotion.approved",
    params: { toRating: 3, comment: "欢迎加入塔台" },
    site: "web",
    path: "/pilots",
    createdAt: minutesAgo(2),
    read: false,
  },
  {
    id: 7,
    source: "broadcast",
    kind: "activity.published",
    params: {
      activityId: 12,
      title: "国庆联飞",
      startsAt: "2026-10-01T12:00:00Z",
    },
    site: "web",
    path: "/activities/12",
    createdAt: minutesAgo(45),
    read: false,
  },
  {
    id: 40,
    source: "member",
    kind: "reservation.cancelledByStaff",
    params: { callsign: "ZBAA_TWR", startsAt: "2026-10-02T10:00:00Z" },
    site: "controller",
    path: "/frame",
    createdAt: minutesAgo(180),
    read: false,
  },
  {
    id: 39,
    source: "member",
    kind: "exam.passed",
    params: { paper: "S2 理论", score: 92, promoted: true },
    site: "exam",
    path: "/",
    createdAt: minutesAgo(60 * 26),
    read: true,
  },
  {
    id: 38,
    source: "member",
    kind: "security.newSignIn",
    params: { browser: "Safari", os: "iOS", ipPrefix: "203.0.113.0/24" },
    site: "web",
    path: "/pilots/account",
    createdAt: minutesAgo(60 * 50),
    read: true,
  },
  {
    id: 37,
    source: "member",
    kind: "redemption.cancelled",
    params: { prize: "机模", points: 300, note: "库存不足" },
    site: "web",
    path: "/rewards",
    createdAt: minutesAgo(60 * 24 * 3),
    read: true,
  },
  {
    id: 36,
    source: "member",
    kind: "access.aipGranted",
    params: {},
    site: "database",
    path: "/",
    createdAt: minutesAgo(60 * 24 * 9),
    read: true,
  },
  {
    id: 35,
    source: "member",
    kind: "future.kind",
    params: {},
    site: "web",
    path: "/",
    createdAt: minutesAgo(60 * 24 * 12),
    read: true,
  },
];

const FIXTURE_PAGE = 5;

function reply(status: number, body?: unknown): Response {
  return body === undefined
    ? new Response(null, { status })
    : new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      });
}

async function fixtureFetch(
  input: string,
  init: RequestInit,
): Promise<Response> {
  await new Promise((resolve) => setTimeout(resolve, 400));
  const url = new URL(input, window.location.origin);
  const rows = bell.value === "empty" ? [] : fixtures;
  if (url.pathname === "/api/v1/notifications/unread") {
    return reply(200, { count: rows.filter((row) => !row.read).length });
  }
  if (url.pathname === "/api/v1/notifications") {
    const start = Number(url.searchParams.get("before") ?? 0);
    const end = start + FIXTURE_PAGE;
    return reply(200, {
      items: rows.slice(start, end),
      next: end < rows.length ? String(end) : null,
    });
  }
  if (url.pathname === "/api/v1/notifications/read-all") {
    for (const row of fixtures) row.read = true;
    return reply(204);
  }
  const match = /^\/api\/v1\/notifications\/(member|broadcast)\/(\d+)$/.exec(
    url.pathname,
  );
  if (match && init.method === "PATCH") {
    const row = fixtures.find(
      (have) => have.source === match[1] && have.id === Number(match[2]),
    );
    if (row) row.read = true;
    return reply(row ? 204 : 404);
  }
  return reply(404);
}

provide(NOTIFICATION_FETCH_KEY, fixtureFetch);

const user = computed<FrameUser | null>(() =>
  signedIn.value ? { name: "Li Wei", id: 1024, rating: 11 } : null,
);

const nav: NavItem[] = [
  { name: "管制员面板", href: "/frame", icon: "home" },
  { name: "ATIS 生成器", href: "#atis", icon: "speakerWave" },
  {
    name: "规则",
    icon: "documentText",
    children: [
      { name: "管制规则", href: "#rules" },
      { name: "管制预约", href: "#reservations", icon: "calendarDays" },
    ],
  },
];

const workspaces: Workspace[] = [
  { key: "pilots", name: "机组", href: "#pilots", icon: "paperAirplane" },
  { key: "controllers", name: "管制", href: "/frame", icon: "signal" },
  { key: "exams", name: "考试", href: "#exams", icon: "academicCap" },
];

const messages = {
  skipToContent: "跳到主要内容",
  signIn: "登录",
  signOut: "退出登录",
  signingOut: "正在退出…",
  openSidebar: "打开侧栏",
  openMenu: "打开菜单",
  openUserMenu: "打开账户菜单",
  siteNavigation: "本站导航",
  sidebar: "侧栏",
  workspace: { label: "分区" },
  search: {
    label: "快速跳转",
    placeholder: "跳转到…",
    noResults: "没有匹配项。",
  },
  rail: { collapse: "收起侧栏", expand: "展开侧栏", me: "我" },
  noAccess: {
    title: "你没有访问这个页面的权限",
    rating: "需要 {required} 级或以上。",
    permission: "需要 {name} 权限。",
    signedInAs: "当前登录：{name}（#{id}）。",
    reachable: "你可以使用的站点",
  },
};

function href(next: {
  layout?: FrameLayout;
  signedIn?: boolean;
  denied?: boolean;
  bell?: BellMode;
}): string {
  const params = new URLSearchParams({
    layout: next.layout ?? layout.value,
    signedIn: (next.signedIn ?? signedIn.value) ? "1" : "0",
    denied: (next.denied ?? denied.value) ? "1" : "0",
    bell: next.bell ?? bell.value,
  });
  return `/frame?${params.toString()}`;
}
</script>

<template>
  <CanFrame
    :key="`${layout}-${bell}`"
    :layout="layout"
    :notifications="bell !== 'off'"
    current="controller"
    locale="zh-cn"
    pathname="/frame"
    :nav="nav"
    :workspaces="workspaces"
    active-workspace="controllers"
    :user="user"
    :profile-items="profileItems"
    sign-in-href="#signin"
    after-sign-out="reload"
    :messages="messages"
  >
    <div
      :class="
        layout === 'rail'
          ? 'min-h-dvh pb-[calc(var(--tabbar-height)+env(safe-area-inset-bottom))] md:pb-0 md:pl-[var(--rail-current)]'
          : layout === 'map'
            ? 'h-full overflow-auto bg-surface-sunken'
            : ''
      "
    >
      <NoAccess
        v-if="denied && user"
        :reason="{ kind: 'rating', required: 12 }"
        :user-name="user.name"
        :user-id="user.id"
        current="database"
        locale="zh-cn"
        :rating="user.rating"
        :messages="messages"
      >
        <template #next-steps>
          <p class="text-sm text-muted">这里放站点自己的指引。</p>
        </template>
      </NoAccess>

      <div v-else class="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-10">
        <h1 class="text-2xl font-semibold text-ink">CanFrame · {{ layout }}</h1>
        <p class="text-muted">按 ⌘K 或 Ctrl+K 打开快速跳转。</p>
        <div class="flex flex-wrap gap-2">
          <a
            v-for="option in LAYOUTS"
            :key="option"
            :href="href({ layout: option })"
            class="btn btn-secondary px-3 py-1.5 text-sm"
          >
            {{ option }}
          </a>
        </div>
        <div class="flex flex-wrap gap-2">
          <a
            :href="href({ signedIn: !signedIn })"
            class="btn btn-ghost px-3 py-1.5 text-sm"
          >
            {{ signedIn ? "模拟未登录" : "模拟已登录" }}
          </a>
          <a
            :href="href({ denied: !denied, signedIn: true })"
            class="btn btn-ghost px-3 py-1.5 text-sm"
          >
            {{ denied ? "关闭无权限页" : "显示无权限页" }}
          </a>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm text-muted">通知：</span>
          <a
            v-for="mode in BELL_MODES"
            :key="mode"
            :href="href({ bell: mode })"
            :aria-current="bell === mode ? 'true' : undefined"
            class="btn btn-ghost px-3 py-1.5 text-sm aria-[current]:text-can"
          >
            {{ mode }}
          </a>
        </div>
        <p v-for="n in 30" :key="n" class="text-sm text-faint">
          占位段落 {{ n }}，用于检查滚动与页脚。
        </p>
      </div>
    </div>
  </CanFrame>
</template>
