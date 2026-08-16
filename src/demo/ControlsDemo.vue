<script setup lang="ts">
import { ref } from "vue";
import Button from "../components/Button.vue";
import Badge from "../components/Badge.vue";
import Icon from "../components/Icon.vue";
import Input from "../components/Input.vue";
import Select from "../components/Select.vue";
import Textarea from "../components/Textarea.vue";
import Toggle from "../components/Toggle.vue";
import Segmented from "../components/Segmented.vue";
import AlertBox from "../components/AlertBox.vue";

const loading = ref(false);
const notify = ref(true);
const strict = ref(false);
const view = ref<"all" | "atc" | "pilot">("all");
const callsign = ref("CES2158");
const remark = ref("");
const rating = ref("S2");
const bad = ref("");

function submit() {
  loading.value = true;
  setTimeout(() => (loading.value = false), 1400);
}
</script>

<template>
  <div class="space-y-10">
    <section>
      <h3 class="text-title-3 mb-4 text-ink">按钮</h3>
      <div class="flex flex-wrap items-center gap-3">
        <Button variant="primary">主要动作</Button>
        <Button variant="secondary">次要</Button>
        <Button variant="soft">品牌淡色</Button>
        <Button variant="danger">删除</Button>
        <Button variant="ghost">幽灵</Button>
        <Button :loading="loading" @click="submit">提交</Button>
        <Button variant="secondary" icon-only label="设置">
          <template #icon><Icon name="cog6Tooth" class="size-4" /></template>
        </Button>
        <Button disabled>不可用</Button>
      </div>
      <p class="text-caption mt-3 text-muted">
        按下即有反馈——不是等到松手。按住任一按钮把手指滑开，高亮会跟着撤销；滑回来又亮起。
      </p>
    </section>

    <section>
      <h3 class="text-title-3 mb-4 text-ink">徽章</h3>
      <div class="flex flex-wrap items-center gap-2">
        <Badge variant="success" dot pulse>在线</Badge>
        <Badge variant="info">S2</Badge>
        <Badge variant="warning">待审</Badge>
        <Badge variant="danger">离线</Badge>
        <Badge variant="neutral" size="sm">草稿</Badge>
      </div>
    </section>

    <section>
      <h3 class="text-title-3 mb-4 text-ink">分段控件</h3>
      <div class="flex flex-wrap items-center gap-4">
        <Segmented
          v-model="view"
          label="过滤"
          :segments="[
            { value: 'all', label: '全部' },
            { value: 'atc', label: '管制员' },
            { value: 'pilot', label: '飞行员' },
          ]"
        />
        <span class="text-caption text-muted">当前：{{ view }}</span>
      </div>
      <p class="text-caption mt-3 text-muted">
        指示块是被弹簧推着滑过去的，不是背景色跳过去。连点两下会看到它折返，而不是走完再重来。
      </p>
    </section>

    <section>
      <h3 class="text-title-3 mb-4 text-ink">表单</h3>
      <div class="grid gap-5 sm:grid-cols-2">
        <Input
          v-model="callsign"
          name="callsign"
          label="呼号"
          hint="连线时使用的呼号"
        >
          <template #leadingIcon>
            <Icon name="paperAirplane" class="size-4" />
          </template>
        </Input>
        <Select
          v-model="rating"
          name="rating"
          label="管制等级"
          :options="[
            { value: 'S1', label: 'S1 — 地面' },
            { value: 'S2', label: 'S2 — 塔台' },
            { value: 'S3', label: 'S3 — 进近' },
            { value: 'C1', label: 'C1 — 区域' },
          ]"
        />
        <Input
          v-model="bad"
          name="freq"
          label="频率"
          placeholder="118.100"
          error="频率必须落在 118.000–136.975 之间"
        />
        <div class="space-y-4">
          <Toggle
            v-model="notify"
            label="连线提醒"
            description="有管制员上线时通知我"
          />
          <Toggle
            v-model="strict"
            label="严格模式"
            description="偏离航路时给出警告"
          />
        </div>
        <div class="sm:col-span-2">
          <Textarea
            v-model="remark"
            name="remark"
            label="备注"
            :maxlength="200"
            counter
            placeholder="留给下一位管制员的移交说明…"
          />
        </div>
      </div>
    </section>

    <section>
      <h3 class="text-title-3 mb-4 text-ink">反馈横幅</h3>
      <div class="space-y-3">
        <AlertBox variant="success" title="飞行计划已提交">
          机组已在 ZBAA 收到。
        </AlertBox>
        <AlertBox variant="danger" title="无法连接">
          FSD 拒绝了本次登录，请检查 CID 与密码。
        </AlertBox>
        <AlertBox variant="warning" dismissible>
          该扇区在 15 分钟后关闭。
        </AlertBox>
        <AlertBox variant="info">数据每 15 秒刷新一次。</AlertBox>
      </div>
    </section>
  </div>
</template>
