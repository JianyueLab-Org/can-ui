<script setup lang="ts">
/**
 * The interactive demo. An interface like this cannot be specified on paper —
 * you find out whether a spring feels right by grabbing it, and a working
 * prototype also sets a bar that stops the shipped version quietly becoming
 * mediocre.
 */
import { computed, ref, onMounted, onBeforeUnmount } from "vue";
import Button from "../components/Button.vue";
import Card from "../components/Card.vue";
import Badge from "../components/Badge.vue";
import { useSpring } from "../motion/useSpring";
import { useDrag } from "../motion/useDrag";
import { project, projectToDetent, rubberband } from "../motion/project";

/* ── 1. Two numbers ─────────────────────────────────────────────────────── */

const damping = ref(1);
const response = ref(0.35);
const at = ref(0);

const track = ref<HTMLElement | null>(null);
const travel = ref(240);

const { value: knob, to: moveKnob, spring: knobSpring } = useSpring(0);

function measureTrack() {
  const el = track.value;
  if (el) travel.value = Math.max(el.clientWidth - 56, 40);
}

function send(to: 0 | 1) {
  at.value = to;
  knobSpring.configure({ damping: damping.value, response: response.value });
  moveKnob(to * travel.value);
}

/* ── 2. Interruptibility ────────────────────────────────────────────────── */

const cssAt = ref(0);
const springAt = ref(0);
const { value: springX, to: moveSpring } = useSpring(0, { preset: "gentle" });
const raceTrack = ref<HTMLElement | null>(null);
const raceTravel = ref(240);

function measureRace() {
  const el = raceTrack.value;
  if (el) raceTravel.value = Math.max(el.clientWidth - 56, 40);
}

function race() {
  cssAt.value = cssAt.value ? 0 : 1;
  springAt.value = springAt.value ? 0 : 1;
  moveSpring(springAt.value * raceTravel.value);
}

/* ── 3. Throw it ────────────────────────────────────────────────────────── */

const lane = ref<HTMLElement | null>(null);
const puck = ref<HTMLElement | null>(null);
const laneWidth = ref(320);
const detents = computed(() => {
  const w = laneWidth.value;
  return [0, w / 2, w];
});

const {
  value: puckX,
  to: movePuck,
  track: trackPuck,
  spring: puckSpring,
} = useSpring(0, { preset: "bouncy" });

const released = ref<{
  velocity: number;
  projected: number;
  landed: number;
} | null>(null);
let grabbedAt = 0;

useDrag(puck, {
  axis: "x",
  threshold: 4,
  onStart: () => {
    puckSpring.pause();
    grabbedAt = puckX.value;
    released.value = null;
  },
  onMove: (state) => {
    const raw = grabbedAt + state.dx;
    const max = laneWidth.value;
    // Resistance outside the lane rather than a wall.
    let next = raw;
    if (raw < 0) next = rubberband(raw, max || 1);
    else if (raw > max) next = max + rubberband(raw - max, max || 1);
    trackPuck(next);
  },
  onEnd: (state) => {
    const landed = projectToDetent(puckX.value, state.vx, detents.value);
    released.value = {
      velocity: Math.round(state.vx),
      projected: Math.round(puckX.value + project(state.vx)),
      landed: Math.round(landed),
    };
    movePuck(landed, { velocity: state.vx });
  },
});

function measureLane() {
  const el = lane.value;
  if (el) laneWidth.value = Math.max(el.clientWidth - 64, 40);
}

/* ── lifecycle ──────────────────────────────────────────────────────────── */

function measureAll() {
  measureTrack();
  measureRace();
  measureLane();
}

onMounted(() => {
  measureAll();
  window.addEventListener("resize", measureAll);
});
onBeforeUnmount(() => window.removeEventListener("resize", measureAll));
</script>

<template>
  <div class="space-y-8">
    <!-- 1 -->
    <Card title="两个数字" subtitle="阻尼比与响应时间——不是质量／劲度／阻尼">
      <div ref="track" class="relative h-14 rounded-card bg-surface-sunken">
        <span
          class="absolute top-2 size-10 rounded-control bg-can shadow-card"
          :style="{ transform: `translateX(${knob}px)`, left: '8px' }"
        />
      </div>

      <div class="mt-5 grid gap-5 sm:grid-cols-2">
        <label class="block">
          <span class="flex items-baseline justify-between">
            <span class="text-sm font-medium text-ink">阻尼 damping</span>
            <span class="tnum text-caption text-muted">{{
              damping.toFixed(2)
            }}</span>
          </span>
          <input
            v-model.number="damping"
            type="range"
            min="0.3"
            max="1.4"
            step="0.02"
            class="mt-2 w-full accent-[var(--color-can)]"
          />
          <span class="text-caption text-faint">
            1.00 = 临界阻尼，不过冲。越低越弹。
          </span>
        </label>

        <label class="block">
          <span class="flex items-baseline justify-between">
            <span class="text-sm font-medium text-ink">响应 response</span>
            <span class="tnum text-caption text-muted"
              >{{ response.toFixed(2) }}s</span
            >
          </span>
          <input
            v-model.number="response"
            type="range"
            min="0.12"
            max="0.9"
            step="0.01"
            class="mt-2 w-full accent-[var(--color-can)]"
          />
          <span class="text-caption text-faint">
            不是时长——弹簧没有固定时长。
          </span>
        </label>
      </div>

      <div class="mt-5 flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" @click="send(0)">← 左</Button>
        <Button size="sm" variant="secondary" @click="send(1)">右 →</Button>
        <Button
          size="sm"
          variant="ghost"
          @click="((damping = 1), (response = 0.35), send(at ? 0 : 1))"
        >
          回到默认
        </Button>
        <span class="text-caption text-muted">
          动画途中再点一次另一个方向：它会拐弯，不会走完再重来。
        </span>
      </div>
    </Card>

    <!-- 2 -->
    <Card
      title="为什么不用 CSS transition"
      subtitle="在动画中途反复点击这个按钮，看两条的差别"
    >
      <div ref="raceTrack" class="space-y-3">
        <div>
          <p class="text-caption mb-1.5 flex items-center gap-2 text-muted">
            <Badge variant="neutral" size="sm">CSS transition</Badge>
            打断后从静止重新起步
          </p>
          <div class="relative h-14 rounded-card bg-surface-sunken">
            <span
              class="absolute left-2 top-2 size-10 rounded-control bg-[var(--color-faint)]"
              :style="{
                transform: `translateX(${cssAt * raceTravel}px)`,
                transition: 'transform 600ms cubic-bezier(0.22, 1, 0.36, 1)',
              }"
            />
          </div>
        </div>

        <div>
          <p class="text-caption mb-1.5 flex items-center gap-2 text-muted">
            <Badge variant="info" size="sm">spring</Badge>
            带着当前速度改向
          </p>
          <div class="relative h-14 rounded-card bg-surface-sunken">
            <span
              class="absolute left-2 top-2 size-10 rounded-control bg-can"
              :style="{ transform: `translateX(${springX}px)` }"
            />
          </div>
        </div>
      </div>

      <div class="mt-4">
        <Button size="sm" @click="race">来回切换</Button>
      </div>
    </Card>

    <!-- 3 -->
    <Card
      title="甩出去"
      subtitle="1:1 跟手 · 越界橡皮筋 · 松手按动量投射选目标 · 速度无缝交接"
    >
      <div
        ref="lane"
        class="relative h-20 touch-pan-y rounded-card bg-surface-sunken"
      >
        <!-- The three detents, so the projection has something visible to
             land on. -->
        <span
          v-for="d in detents"
          :key="d"
          class="absolute top-1/2 h-8 w-px -translate-y-1/2 bg-[var(--border-strong)]"
          :style="{ left: `${d + 32}px` }"
          aria-hidden="true"
        />
        <span
          ref="puck"
          class="absolute left-4 top-4 size-12 cursor-grab touch-none select-none rounded-card bg-can shadow-card-hover active:cursor-grabbing"
          :style="{ transform: `translateX(${puckX}px)` }"
        />
      </div>

      <div class="mt-4 grid gap-2 sm:grid-cols-3">
        <p class="text-caption text-muted">
          松手速度
          <span class="tnum block text-ink">
            {{ released ? `${released.velocity} px/s` : "—" }}
          </span>
        </p>
        <p class="text-caption text-muted">
          投射落点
          <span class="tnum block text-ink">
            {{ released ? `${released.projected} px` : "—" }}
          </span>
        </p>
        <p class="text-caption text-muted">
          归位到
          <span class="tnum block text-ink">
            {{ released ? `${released.landed} px` : "—" }}
          </span>
        </p>
      </div>

      <p class="text-caption mt-3 text-muted">
        轻轻拖到中点右边一点松手，它回中点；从同一位置往右一甩，它到右端。落点是从<strong
          class="font-semibold text-ink"
          >动量要去的地方</strong
        >选的，不是松手那一瞬间的位置——否则甩这个动作就白做了。
      </p>
    </Card>
  </div>
</template>
