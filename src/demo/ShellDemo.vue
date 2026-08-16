<script setup lang="ts">
import { ref } from "vue";
import AppShell from "../components/AppShell.vue";
import PageHeader from "../components/PageHeader.vue";
import StatCard from "../components/StatCard.vue";
import Card from "../components/Card.vue";
import Button from "../components/Button.vue";
import AlertBox from "../components/AlertBox.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import type { NavItem, NavSecondary, Workspace } from "../nav";

const workspaces: Workspace[] = [
  { key: "pilots", name: "机组", href: "#pilots", icon: "paperAirplane" },
  { key: "controllers", name: "管制", href: "#controllers", icon: "signal" },
  { key: "exams", name: "考试", href: "#exams", icon: "academicCap" },
];

const navigation: NavItem[] = [
  { name: "总览", href: "/shell", icon: "home" },
  { name: "飞行计划", href: "#flightplan", icon: "paperAirplane" },
  {
    name: "飞行记录",
    icon: "clock",
    children: [
      { name: "最近航段", href: "#recent" },
      { name: "统计", href: "#stats" },
      { name: "里程", href: "#miles" },
    ],
  },
  {
    name: "训练",
    icon: "academicCap",
    children: [
      { name: "大纲", href: "#syllabus" },
      { name: "预约", href: "#booking" },
    ],
  },
  { name: "设置", href: "#settings", icon: "cog6Tooth" },
];

const secondary: NavSecondary = {
  label: "快捷入口",
  items: [
    { name: "实时雷达", href: "#radar", icon: "globeAlt" },
    { name: "花名册", href: "#roster", icon: "users" },
    { name: "文档", href: "#docs", icon: "bookOpen" },
  ],
};

const messages = {
  skipToContent: "跳到主要内容",
  signOut: "退出登录",
  openSidebar: "打开侧栏",
  closeSidebar: "关闭侧栏",
  close: "关闭",
  openUserMenu: "打开账户菜单",
  workspace: { label: "分区" },
  search: {
    label: "快速跳转",
    placeholder: "跳转到…",
    noResults: "没有匹配的项。",
  },
  theme: {
    label: "外观",
    light: "浅色",
    dark: "深色",
    system: "跟随系统",
  },
  language: { label: "选择语言" },
};

const signedOut = ref(false);
</script>

<template>
  <AppShell
    :navigation="navigation"
    :secondary="secondary"
    :workspaces="workspaces"
    active-workspace="pilots"
    pathname="/shell"
    :messages="messages"
    locale="zh-cn"
    user-name="Jiang Hao"
    user-id="1275301"
    :profile-items="[
      { name: '个人资料', href: '#profile', icon: 'userCircle' },
      { name: '我的统计', href: '#stats', icon: 'chartBar' },
    ]"
    home-href="/"
    @signout="signedOut = true"
  >
    <PageHeader
      eyebrow="机组"
      title="总览"
      description="这一整页都是 can-ui 的 AppShell —— 左栏、顶栏、⌘K 面板、账户菜单全在组件里。"
    >
      <template #actions>
        <Button variant="secondary" size="sm" as="a" href="/">
          返回组件画廊
        </Button>
      </template>
    </PageHeader>

    <AlertBox
      v-if="signedOut"
      variant="info"
      title="收到 @signout 事件"
      class="mb-6"
    >
      外壳本身<strong>不调任何接口</strong>——它只是把事件抛出来，由站点决定调用
      can-api 并跳转到哪里。这正是它当初抽不出来的主要原因。
    </AlertBox>

    <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
      <StatCard
        label="本月航段"
        :value="18"
        icon="paperAirplane"
        accent="info"
      />
      <StatCard label="飞行小时" value="42.5" icon="clock" accent="success" />
      <StatCard label="管制小时" value="7.0" icon="signal" accent="neutral" />
      <StatCard label="待办" :value="2" icon="inbox" accent="warning" />
    </div>

    <div class="mt-8 grid gap-6 lg:grid-cols-2">
      <Card title="试试这些" subtitle="外壳里真正值得动手的部分">
        <ListGroup>
          <ListRow
            label="按 ⌘K / Ctrl+K"
            description="快速跳转搜的是左栏本身——加一条路由它就在里面"
            icon="magnifyingGlass"
          />
          <ListRow
            label="把窗口收窄到 1024px 以下"
            description="左栏变成抽屉；抓住它往左推可以关掉，不只是点遮罩"
            icon="bars3"
          />
          <ListRow
            label="展开「飞行记录」"
            description="0fr→1fr 的网格行过渡——高度是浏览器算出来的，这是唯一能过渡它的办法"
            icon="chevronDown"
          />
          <ListRow
            label="右上角切换主题"
            description="圆形擦除从你按下的那颗按钮扩开"
            icon="sun"
          />
          <ListRow
            label="账户菜单 → 退出登录"
            description="只会抛事件，不会真的登出"
            icon="arrowRightOnRectangle"
          />
        </ListGroup>
      </Card>

      <Card title="它不知道的事" subtitle="抽出来时被拆掉的四处耦合">
        <ul class="space-y-3 text-sm text-muted">
          <li>
            <strong class="text-ink">can-api。</strong>
            登出原本就写在外壳里。设计系统不该知道网络的鉴权端点。
          </li>
          <li>
            <strong class="text-ink">站点的 i18n 模块。</strong>
            现在收 <code>messages</code>，缺键回退到英文。
          </li>
          <li>
            <strong class="text-ink">/logo-full.png。</strong>
            只有 can-web 提供这个路径。现在是插槽，默认渲染
            <code>&lt;Logo&gt;</code>。
          </li>
          <li>
            <strong class="text-ink">/pilots/status。</strong>
            六个站里只有一个有这条路由。现在是 <code>profileItems</code>。
          </li>
        </ul>
      </Card>
    </div>

    <template #footer>
      <p class="text-sm text-faint">can-ui · AppShell 演示 · 页脚也是插槽</p>
    </template>
  </AppShell>
</template>
