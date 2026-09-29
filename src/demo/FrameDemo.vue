<script setup lang="ts">
/**
 * CanFrame in each layout. Query: `layout`, `signedIn`, `denied`.
 * Mounted client-only: the layout comes from the URL.
 */
import { computed, onMounted, ref } from "vue";
import CanFrame from "../components/CanFrame.vue";
import NoAccess from "../components/NoAccess.vue";
import type { FrameLayout, FrameUser } from "../frame";
import type { NavChild, NavItem, Workspace } from "../nav";

const profileItems: NavChild[] = [
  { name: "账号", href: "#account", icon: "userCircle" },
];

const LAYOUTS: FrameLayout[] = ["content", "tool", "rail", "map"];

const layout = ref<FrameLayout>("content");
const signedIn = ref(true);
const denied = ref(false);

onMounted(() => {
  const params = new URLSearchParams(window.location.search);
  const requested = params.get("layout");
  if (requested && (LAYOUTS as string[]).includes(requested)) {
    layout.value = requested as FrameLayout;
  }
  signedIn.value = params.get("signedIn") !== "0";
  denied.value = params.get("denied") === "1";
});

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
}): string {
  const params = new URLSearchParams({
    layout: next.layout ?? layout.value,
    signedIn: (next.signedIn ?? signedIn.value) ? "1" : "0",
    denied: (next.denied ?? denied.value) ? "1" : "0",
  });
  return `/frame?${params.toString()}`;
}
</script>

<template>
  <CanFrame
    :key="layout"
    :layout="layout"
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
        <p v-for="n in 30" :key="n" class="text-sm text-faint">
          占位段落 {{ n }}，用于检查滚动与页脚。
        </p>
      </div>
    </div>
  </CanFrame>
</template>
