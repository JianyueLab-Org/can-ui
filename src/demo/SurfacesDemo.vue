<script setup lang="ts">
import { ref } from "vue";
import Button from "../components/Button.vue";
import Icon from "../components/Icon.vue";
import Dialog from "../components/Dialog.vue";
import Sheet from "../components/Sheet.vue";
import Popover from "../components/Popover.vue";
import ListGroup from "../components/ListGroup.vue";
import ListRow from "../components/ListRow.vue";
import Input from "../components/Input.vue";

const dialogOpen = ref(false);
const confirmOpen = ref(false);
const sheetOpen = ref(false);
const detentSheetOpen = ref(false);
const lastDetent = ref<number | null>(null);
</script>

<template>
  <div class="space-y-10">
    <section>
      <h3 class="text-title-3 mb-1 text-ink">对话框</h3>
      <p class="text-caption mb-4 text-muted">
        遮罩压暗页面、面板从中心浮起——这一对说的是「现在只有这件事」。
      </p>
      <div class="flex flex-wrap gap-3">
        <Button variant="secondary" @click="dialogOpen = true">
          打开对话框
        </Button>
        <Button variant="danger" @click="confirmOpen = true">
          需要作答的确认
        </Button>
      </div>
    </section>

    <section>
      <h3 class="text-title-3 mb-1 text-ink">Sheet</h3>
      <p class="text-caption mb-4 text-muted">
        抓住标题栏往下拖。它 1:1
        跟手；往上拖会遇到逐渐变强的阻力；松手时按<strong
          class="font-semibold text-ink"
          >甩出去的方向</strong
        >而不是松手的位置决定归位到哪一档。动画途中还能再次抓住它反向拖。
      </p>
      <div class="flex flex-wrap gap-3">
        <Button variant="secondary" @click="sheetOpen = true"
          >打开 Sheet</Button
        >
        <Button variant="secondary" @click="detentSheetOpen = true">
          两档 Sheet（半高 / 全高）
        </Button>
        <span
          v-if="lastDetent !== null"
          class="text-caption self-center text-muted"
        >
          停在 {{ Math.round(lastDetent * 100) }}%
        </span>
      </div>
    </section>

    <section>
      <h3 class="text-title-3 mb-1 text-ink">Popover</h3>
      <p class="text-caption mb-4 text-muted">
        从按下的那个按钮长出来，而不是从自己的中心放大；不压暗页面，因为它是并行的面板，不是打断。
      </p>
      <div class="flex flex-wrap gap-3">
        <Popover label="过滤" width="17rem">
          <template #trigger="{ toggle }">
            <Button variant="secondary" @click="toggle">
              <template #icon><Icon name="funnel" class="size-4" /></template>
              过滤
            </Button>
          </template>
          <template #default="{ close }">
            <div class="p-2">
              <Input name="q" placeholder="搜索机场…" />
            </div>
            <ListRow label="仅显示已连线" chevron @click="close" />
            <ListRow label="仅本管制区" chevron @click="close" />
            <ListRow label="含模拟机会话" chevron @click="close" />
          </template>
        </Popover>

        <Popover label="账户" placement="bottom-end" width="13rem">
          <template #trigger="{ toggle }">
            <Button variant="ghost" @click="toggle">
              <template #icon
                ><Icon name="userCircle" class="size-4"
              /></template>
              1275301
            </Button>
          </template>
          <template #default="{ close }">
            <ListRow
              label="个人资料"
              icon="userCircle"
              chevron
              @click="close"
            />
            <ListRow label="偏好设置" icon="cog6Tooth" chevron @click="close" />
            <ListRow
              label="退出登录"
              icon="arrowRightOnRectangle"
              destructive
              chevron
              @click="close"
            />
          </template>
        </Popover>
      </div>
    </section>

    <!-- ── overlays ─────────────────────────────────────────────────────── -->

    <Dialog
      v-model:open="dialogOpen"
      title="提交飞行计划"
      description="提交后已连线的机组会立即看到改动。"
      size="md"
    >
      <div class="space-y-4">
        <Input name="dep" label="起飞机场" placeholder="ZSPD" />
        <Input name="arr" label="降落机场" placeholder="RJTT" />
        <Input name="route" label="航路" placeholder="SASAN A593 LAMEN" />
      </div>
      <template #footer>
        <Button variant="ghost" @click="dialogOpen = false">取消</Button>
        <Button @click="dialogOpen = false">提交</Button>
      </template>
    </Dialog>

    <Dialog
      v-model:open="confirmOpen"
      title="解散该管制席位？"
      description="该席位下的移交将全部退回，此操作不可撤销。"
      size="sm"
      :dismissible="false"
    >
      <p class="text-sm text-muted">
        不可撤销的操作才配得上一个走不掉的确认框。滥用它只会训练成员闭眼点确定。
      </p>
      <template #footer>
        <Button variant="ghost" @click="confirmOpen = false">返回</Button>
        <Button variant="danger" @click="confirmOpen = false">解散</Button>
      </template>
    </Dialog>

    <Sheet
      v-model:open="sheetOpen"
      title="ZSPD / 浦东"
      description="东跑道运行中"
    >
      <ListGroup title="当前席位">
        <ListRow label="ZSPD_TWR" value="118.850" icon="signal" />
        <ListRow label="ZSPD_GND" value="121.800" icon="signal" />
        <ListRow label="ZSPD_DEL" value="121.600" icon="signal" />
      </ListGroup>
      <div class="h-4"></div>
      <ListGroup title="气象" footnote="METAR 每半小时更新一次。">
        <ListRow label="风" value="090° 8kt" />
        <ListRow label="能见度" value="9000m" />
        <ListRow label="修正海压" value="1013" />
      </ListGroup>
    </Sheet>

    <Sheet
      v-model:open="detentSheetOpen"
      title="航路"
      :detents="[0.45, 1]"
      @detent="lastDetent = $event"
    >
      <p class="text-sm text-muted">
        往上甩一下，它会去全高档；轻轻往下拖再松手，它回半高档。目标是按动量投射出来的落点选的，不是松手那一瞬间的位置。
      </p>
      <div class="mt-4 space-y-3">
        <div v-for="n in 14" :key="n" class="card p-4">
          <p class="text-sm font-medium text-ink">航路点 {{ n }}</p>
          <p class="text-caption text-muted">
            FL{{ 240 + n * 2 }} · {{ 120 + n * 7 }}nm
          </p>
        </div>
      </div>
    </Sheet>
  </div>
</template>
