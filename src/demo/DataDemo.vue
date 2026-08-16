<script setup lang="ts">
import { ref } from "vue";
import StatCard from "../components/StatCard.vue";
import DataTable from "../components/DataTable.vue";
import Badge from "../components/Badge.vue";
import Button from "../components/Button.vue";
import EmptyState from "../components/EmptyState.vue";
import Skeleton from "../components/Skeleton.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import Toggle from "../components/Toggle.vue";
import Card from "../components/Card.vue";

interface Flight {
  callsign: string;
  route: string;
  altitude: number;
  status: "cruise" | "climb" | "descent";
}

const loading = ref(false);
const flights = ref<Flight[]>([
  {
    callsign: "CES2158",
    route: "ZSPD → RJTT",
    altitude: 36000,
    status: "cruise",
  },
  {
    callsign: "CSN3104",
    route: "ZGGG → ZBAA",
    altitude: 12000,
    status: "climb",
  },
  {
    callsign: "CCA1501",
    route: "ZBAA → ZSSS",
    altitude: 8000,
    status: "descent",
  },
  {
    callsign: "CHH7801",
    route: "ZJHK → ZUUU",
    altitude: 34000,
    status: "cruise",
  },
]);

const columns = [
  { key: "callsign", label: "呼号" },
  { key: "route", label: "航路" },
  { key: "altitude", label: "高度", align: "right" as const },
  { key: "status", label: "状态", align: "right" as const },
];

const tone = {
  cruise: "success",
  climb: "info",
  descent: "warning",
} as const;

const labels = { cruise: "巡航", climb: "上升", descent: "下降" };

function reload() {
  loading.value = true;
  setTimeout(() => (loading.value = false), 1600);
}

const sound = ref(true);
</script>

<template>
  <div class="space-y-10">
    <section>
      <h3 class="text-title-3 mb-4 text-ink">数据磁贴</h3>
      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="在线机组"
          :value="42"
          icon="paperAirplane"
          accent="info"
        />
        <StatCard
          label="在线管制"
          :value="7"
          icon="signal"
          accent="success"
          hint="覆盖 4 个管制区"
        />
        <StatCard
          label="今日航段"
          :value="318"
          icon="chartBar"
          accent="neutral"
        />
        <StatCard
          label="待审报告"
          :value="3"
          icon="exclamationTriangle"
          accent="warning"
          href="#"
        />
      </div>
      <p class="text-caption mt-3 text-muted">
        数值用等宽数字。这些数字每几秒刷新一次，比例数字会让整行宽度随着 1 变成
        7 而抖动。
      </p>
    </section>

    <section>
      <h3 class="text-title-3 mb-4 text-ink">表格</h3>
      <DataTable
        :columns="columns"
        :rows="flights"
        row-key="callsign"
        :loading="loading"
        :loading-rows="4"
        loading-label="正在载入航班"
        empty="当前没有航班"
      >
        <template #header-actions>
          <p class="text-caption text-muted">
            窗口收窄到 640px 以下，它会变成卡片。
          </p>
          <Button variant="secondary" size="sm" @click="reload">
            重新载入
          </Button>
        </template>
        <template #cell-callsign="{ row }">
          <span class="font-semibold text-ink">{{ row.callsign }}</span>
        </template>
        <template #cell-altitude="{ row }">
          <span class="tnum">{{ row.altitude.toLocaleString() }} ft</span>
        </template>
        <template #cell-status="{ row }">
          <Badge :variant="tone[row.status]" size="sm">
            {{ labels[row.status] }}
          </Badge>
        </template>
      </DataTable>
    </section>

    <section>
      <h3 class="text-title-3 mb-1 text-ink">分组列表</h3>
      <p class="text-caption mb-4 text-muted">
        设置类页面要的是它，不是表格：每一行是横着读的，控件就贴在它所控制的东西旁边。
      </p>
      <div class="grid gap-6 sm:grid-cols-2">
        <ListGroup title="通知" footnote="更改立即生效，无需保存。">
          <ListRow label="管制员上线">
            <template #trailing>
              <Toggle v-model="sound" />
            </template>
          </ListRow>
          <ListRow label="飞行计划被修改" value="仅邮件" href="#" />
          <ListRow label="考试成绩" value="推送" href="#" />
        </ListGroup>

        <ListGroup title="账户">
          <ListRow
            label="修改密码"
            description="上次修改于 2026-05-02"
            icon="key"
            href="#"
          />
          <ListRow label="已授权的应用" value="3" icon="squares2x2" href="#" />
          <ListRow label="注销账户" icon="xCircle" destructive href="#" />
        </ListGroup>
      </div>
    </section>

    <section>
      <h3 class="text-title-3 mb-4 text-ink">空状态与骨架屏</h3>
      <div class="grid gap-6 sm:grid-cols-2">
        <Card padding="none">
          <EmptyState
            title="还没有飞行记录"
            description="连上网络飞一段，这里就会有东西。"
            icon="paperAirplane"
          >
            <template #action>
              <Button size="sm">如何连线</Button>
            </template>
          </EmptyState>
        </Card>
        <Card>
          <Skeleton variant="text" :count="4" />
        </Card>
      </div>
      <p class="text-caption mt-3 text-muted">
        骨架屏优先于转圈：它撑住了布局。变体要选对——用 cards
        的占位撑一个随后渲染成表格的区域，比不放占位更糟。
      </p>
    </section>
  </div>
</template>
