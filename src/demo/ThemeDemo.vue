<script setup lang="ts">
import { computed } from "vue";
import Segmented from "../components/Segmented.vue";
import Badge from "../components/Badge.vue";
import Icon from "../components/Icon.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import { useTheme, THEME_ICONS, type ThemeMode } from "../composables/useTheme";

const { mode, isDark, setMode } = useTheme();

const NAMES: Record<ThemeMode, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
};

// The Segmented writes through `setMode` rather than being v-modelled, because
// `mode` is a readonly ref off shared state — the document is the source of
// truth, not this component.
const selected = computed({
  get: () => mode.value,
  set: (next: ThemeMode) => setMode(next),
});
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center gap-4">
      <Segmented
        v-model="selected"
        label="外观"
        :segments="[
          { value: 'light', label: NAMES.light },
          { value: 'dark', label: NAMES.dark },
          { value: 'system', label: NAMES.system },
        ]"
      />
      <div class="flex items-center gap-2">
        <Badge variant="info" size="sm">
          <Icon :name="THEME_ICONS[mode]" class="size-3" />
          {{ NAMES[mode] }}
        </Badge>
        <Badge :variant="isDark ? 'neutral' : 'warning'" size="sm">
          实际渲染：{{ isDark ? "深色" : "浅色" }}
        </Badge>
      </div>
    </div>

    <ListGroup
      title="这两个是不同的问题"
      footnote="右上角那颗按钮是同一套状态的紧凑形态——三态循环。"
    >
      <ListRow
        label="mode —— 成员选的是什么"
        description="浅色 / 深色 / 跟随系统。存在 localStorage 的 theme 键里，而「跟随系统」存的是这个键不存在。"
        icon="adjustments"
      />
      <ListRow
        label="isDark —— 屏幕上现在是什么"
        description="读的是 <html> 上的 dark 类。选「跟随系统」时它会在日落自己变，而 mode 不变。"
        icon="viewfinderCircle"
      />
      <ListRow
        label="改系统外观试试"
        description="在「跟随系统」下改 macOS / iOS 的外观，这一页会当场跟着变——不需要刷新。"
        icon="computerDesktop"
      />
      <ListRow
        label="开第二个标签页试试"
        description="在一个标签页里改，另一个会跟上。两个同站标签页对外观意见不一致，读起来就是其中一个坏了。"
        icon="squares2x2"
      />
    </ListGroup>
  </div>
</template>
