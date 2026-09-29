<script setup lang="ts">
/**
 * The tool layout's sidebar: the section switcher, then the site's nav.
 * Rendered twice by CanFrame — fixed on desktop, in a Drawer below lg.
 */
import SidebarNav from "./SidebarNav.vue";
import type { NavItem, NavSecondary, Workspace } from "../nav";

withDefaults(
  defineProps<{
    navigation: NavItem[];
    pathname: string;
    secondary?: NavSecondary;
    workspaces?: Workspace[];
    activeWorkspace?: string;
    workspaceLabel: string;
    /** Switcher background: `surface` on a sunken rail, `sunken` in a drawer. */
    tone?: "sunken" | "surface";
    messages?: Record<string, unknown>;
  }>(),
  {
    secondary: undefined,
    workspaces: () => [],
    activeWorkspace: undefined,
    tone: "surface",
    messages: () => ({}),
  },
);
</script>

<template>
  <div class="flex h-full flex-col gap-y-4">
    <div
      v-if="workspaces.length"
      role="group"
      :aria-label="workspaceLabel"
      :class="[
        'flex gap-1 rounded-control p-1',
        tone === 'sunken' ? 'bg-surface-sunken' : 'bg-surface',
      ]"
    >
      <a
        v-for="workspace in workspaces"
        :key="workspace.key"
        :href="workspace.href"
        :aria-current="workspace.key === activeWorkspace ? 'true' : undefined"
        :class="[
          'focus-ring tap-row flex flex-1 items-center justify-center truncate rounded-[calc(var(--radius-control)-2px)] px-2 py-1.5 text-center text-xs font-semibold transition-colors',
          workspace.key === activeWorkspace
            ? 'bg-surface-raised text-can shadow-card'
            : 'text-muted hover:text-ink',
        ]"
      >
        {{ workspace.name }}
      </a>
    </div>

    <SidebarNav
      :navigation="navigation"
      :pathname="pathname"
      :secondary="secondary"
      :messages="messages"
    />
  </div>
</template>
