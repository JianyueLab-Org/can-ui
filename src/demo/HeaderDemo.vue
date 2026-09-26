<script setup lang="ts">
import { ref } from "vue";
import SiteHeader from "../components/SiteHeader.vue";
import SiteFooter from "../components/SiteFooter.vue";
import type { NavChild } from "../nav";
import logoUrl from "../assets/logo/CAN-H-B-CE.svg?url";

const variant = ref<"default" | "compact">("default");
const signedIn = ref(false);

const nav: NavChild[] = [
  { name: "名册", href: "/header" },
  { name: "排行榜", href: "#leaderboard" },
  { name: "活动", href: "#activities" },
  { name: "下载", href: "#downloads" },
];

const labels = {
  skip: "跳到主要内容",
  menu: "打开菜单",
  close: "关闭菜单",
  signIn: "登录",
  signOut: "退出登录",
};
</script>

<template>
  <div class="flex min-h-dvh flex-col bg-surface">
    <SiteHeader
      current="web"
      locale="zh-cn"
      pathname="/header"
      :nav="nav"
      :signed-in="signedIn"
      :rating="signedIn ? 12 : undefined"
      :variant="variant"
      sign-in-href="#signin"
      :labels="labels"
      @signout="signedIn = false"
    />

    <main
      id="main-content"
      tabindex="-1"
      class="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 py-10"
    >
      <h1 class="text-2xl font-semibold text-ink">SiteHeader · SiteFooter</h1>
      <p class="text-muted">
        主站、开发者中心、考试中心和雷达共用这一份站头。「全网」菜单和抽屉里的清单来自
        <code>visibleSites</code>；登录后以 rating 12 渲染，门户与资料库出现。
      </p>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          class="btn btn-ghost"
          @click="variant = variant === 'default' ? 'compact' : 'default'"
        >
          variant：{{ variant }}
        </button>
        <button
          type="button"
          class="btn btn-ghost"
          @click="signedIn = !signedIn"
        >
          {{ signedIn ? "已登录（rating 12）" : "未登录" }}
        </button>
      </div>
      <!-- Tall enough to scroll, so the default variant's edge shows. -->
      <div class="h-[150vh]" aria-hidden="true"></div>
    </main>

    <SiteFooter
      locale="zh-cn"
      current="web"
      :signed-in="signedIn"
      :rating="signedIn ? 12 : undefined"
      :logo-src="logoUrl"
      :compact="variant === 'compact'"
    />
  </div>
</template>
