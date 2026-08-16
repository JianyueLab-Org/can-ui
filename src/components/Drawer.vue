<script setup lang="ts">
/**
 * A panel that slides in from an edge — a mobile sidebar, a filter rail, an
 * inspector.
 *
 * **It leaves by the edge it arrived from.** That is the rule the component
 * exists to enforce, and it is not decoration: if something disappears one
 * way, people expect it to come back from there. A panel that slides in from
 * the left and dismisses downward leaves nobody with any idea where it went,
 * so the way back is a guess. `side` therefore drives the entrance, the exit
 * *and* the drag axis from one value — they cannot be set inconsistently.
 *
 * **It can be pushed back where it came from.** The drag is the same machinery
 * as Sheet's: 1:1 tracking while the finger is down, resistance past the open
 * position rather than a wall, and on release the target comes from where the
 * momentum was heading. A drawer you can only close with its × button is a
 * drawer people close by tapping the scrim and hoping.
 *
 * Unlike Sheet, the whole panel is draggable rather than just a header —
 * a drawer's content is usually a nav list, which scrolls vertically while
 * the drawer moves horizontally, so the browser can arbitrate on its own
 * (`touch-action: pan-y`) and there is no gesture to disambiguate.
 */
import { computed, nextTick, onMounted, ref, watch } from "vue";
import Icon from "./Icon.vue";
import { useOverlay } from "../composables/useOverlay";
import { useSpring } from "../motion/useSpring";
import { useDrag } from "../motion/useDrag";
import { projectToDetent, rubberband } from "../motion/project";

const props = withDefaults(
  defineProps<{
    open: boolean;
    /** Which edge it lives on. Drives entrance, exit and drag direction. */
    side?: "left" | "right";
    title?: string;
    /** Panel width. Anything CSS accepts. */
    width?: string;
    dismissible?: boolean;
    /** Accessible name when there is no visible title. */
    label?: string;
  }>(),
  {
    side: "left",
    width: "18rem",
    dismissible: true,
  },
);

const emit = defineEmits<{ "update:open": [boolean]; close: [] }>();

const isOpen = computed({
  get: () => props.open,
  set: (value) => {
    emit("update:open", value);
    if (!value) emit("close");
  },
});

const panel = useOverlay(isOpen, { dismissible: () => props.dismissible });
const mounted = ref(false);
onMounted(() => (mounted.value = true));

/**
 * Offset is always *positive away from the open position*, whichever edge we
 * are on, and the sign is applied once at the transform. Carrying a signed
 * offset through the gesture maths instead means every comparison needs a
 * branch, and one of them is always the one that gets it backwards.
 */
const OFFSCREEN = 10000;
const width = ref(0);
let pendingClose = false;

const {
  value: offset,
  to: springTo,
  set: springSet,
  track: springTrack,
  spring,
} = useSpring(OFFSCREEN, {
  preset: "sheet",
  onRest: () => {
    if (pendingClose) {
      pendingClose = false;
      isOpen.value = false;
    }
  },
});

const direction = computed(() => (props.side === "left" ? -1 : 1));

const scrimOpacity = computed(() => {
  if (!width.value) return 0;
  return 1 - Math.min(Math.max(offset.value / width.value, 0), 1);
});

function measure() {
  const el = panel.value;
  if (el) width.value = el.offsetWidth;
}

watch(
  isOpen,
  async (open) => {
    if (!open) return;
    await nextTick();
    measure();
    springSet(width.value);
    requestAnimationFrame(() => springTo(0));
  },
  { immediate: true },
);

let grabbedAt = 0;

useDrag(panel, {
  axis: "x",
  threshold: 6,
  // A link is a tap, not a drag — without this every nav item would need 6px
  // of stillness before it could be pressed.
  ignore: "a,button,input,select,textarea",
  onStart: () => {
    spring.pause();
    grabbedAt = offset.value;
  },
  onMove: (state) => {
    // Movement toward the edge closes; movement away is resisted.
    const raw = grabbedAt + state.dx * direction.value;
    const next =
      raw < 0 ? rubberband(raw, width.value || 1) : Math.min(raw, width.value);
    springTrack(next);
  },
  onEnd: (state) => {
    const away = state.vx * direction.value;
    const candidates = props.dismissible ? [0, width.value] : [0];
    const target = projectToDetent(offset.value, away, candidates);
    if (target === width.value && props.dismissible) pendingClose = true;
    springTo(target, { velocity: away });
  },
  onCancel: () => springTo(0),
});

function dismiss() {
  if (!props.dismissible) return;
  pendingClose = true;
  springTo(width.value);
}
</script>

<template>
  <Teleport to="body" :disabled="!mounted">
    <div v-if="open" class="fixed inset-0 z-50">
      <div
        class="absolute inset-0 bg-[var(--scrim)]"
        :style="{ opacity: scrimOpacity }"
        aria-hidden="true"
        @click="dismiss"
      ></div>

      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-label="label ?? title"
        tabindex="-1"
        :class="[
          'absolute inset-y-0 flex max-w-[calc(100vw-3rem)] touch-pan-y flex-col border-subtle bg-surface shadow-sheet',
          side === 'left' ? 'left-0 border-r' : 'right-0 border-l',
        ]"
        :style="{
          width,
          transform: `translate3d(${offset * direction}px, 0, 0)`,
        }"
      >
        <div
          v-if="title || $slots.header || dismissible"
          class="flex shrink-0 items-center gap-3 border-b border-subtle px-4 py-3 pt-safe"
        >
          <div class="min-w-0 flex-1">
            <slot name="header">
              <h2 v-if="title" class="text-title-3 truncate text-ink">
                {{ title }}
              </h2>
            </slot>
          </div>
          <button
            v-if="dismissible"
            type="button"
            class="btn btn-ghost -mr-1.5 size-8 shrink-0 p-0"
            aria-label="Close"
            @click="dismiss"
          >
            <Icon name="xMark" class="size-4" />
          </button>
        </div>

        <div
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 pb-safe"
        >
          <slot />
        </div>

        <div
          v-if="$slots.footer"
          class="shrink-0 border-t border-subtle px-4 py-3 pb-safe"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
