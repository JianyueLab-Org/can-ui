<script setup lang="ts">
/**
 * A bottom sheet you can actually grab.
 *
 * This is the component the whole motion layer exists for, and every rule in
 * it is a rule about *feel* rather than about appearance:
 *
 * **1:1 tracking.** While a finger is down the sheet is not animating — it is
 * following, exactly, at the offset it was grabbed. A spring between the
 * pointer and the surface would add lag to the one interaction where lag is
 * most obvious, because the member is holding the thing and can see it
 * lagging behind their own hand.
 *
 * **Rubber-banding at the top.** Dragged above its tallest detent the sheet
 * keeps moving, but less and less. A hard stop reads as the gesture having
 * been dropped; progressive resistance says "there is nothing more here" while
 * staying visibly alive.
 *
 * **Momentum projection on release.** The target detent is chosen from where
 * the flick was *heading*, not from where the finger happened to let go.
 * Without it a fast flick and a slow drag ending at the same pixel do the same
 * thing, so a flick does nothing — and flicking is what members actually do.
 *
 * **Velocity handoff.** The spring starts at the finger's release velocity, so
 * there is no seam between dragging and animating: the surface simply keeps
 * going at the speed it was already moving.
 *
 * **Interruptible throughout.** A sheet mid-animation can be grabbed again and
 * reversed. That is why the spring is paused rather than stopped on grab —
 * stopping it would zero the velocity and the sheet would visibly hitch at the
 * moment of catching it.
 *
 * **The gesture starts on the header, not the body.** The sheet's content
 * usually scrolls, and a surface that is both draggable and scrollable has to
 * decide which one a downward swipe means. Owning that arbitration means
 * tracking scroll position, cancelling mid-gesture and getting it wrong at the
 * boundary; giving the drag its own region — the grabber and the title bar,
 * which is where the affordance is drawn anyway — means the browser never has
 * to guess. It is the smaller promise, kept properly.
 */
import { computed, nextTick, onMounted, ref, watch } from "vue";
import Icon from "./Icon.vue";
import { useOverlay } from "../composables/useOverlay";
import { useSpring } from "../motion/useSpring";
import { useDrag } from "../motion/useDrag";
import { projectToDetent, rubberband } from "../motion/project";
import { haptics } from "../composables/haptics";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    description?: string;
    /**
     * Resting heights, as the fraction of the sheet's own height that is
     * visible. `[0.5, 1]` is a half-height sheet that can be dragged to full.
     * Sorted and de-duplicated on use, so the order here does not matter.
     */
    detents?: number[];
    /** Drag-down and backdrop tap dismiss. */
    dismissible?: boolean;
    /** Hide the grabber. Only sensible when `dismissible` is false. */
    grabber?: boolean;
    /** Cap the sheet's height. Defaults to most of the viewport. */
    maxHeight?: string;
  }>(),
  {
    detents: () => [1],
    dismissible: true,
    grabber: true,
    maxHeight: "92dvh",
  },
);

const emit = defineEmits<{
  "update:open": [boolean];
  close: [];
  /** The sheet settled at a detent. The value is the visible fraction. */
  detent: [number];
}>();

const isOpen = computed({
  get: () => props.open,
  set: (value) => {
    emit("update:open", value);
    if (!value) emit("close");
  },
});

const panel = useOverlay(isOpen, { dismissible: () => props.dismissible });
const handle = ref<HTMLElement | null>(null);
const mounted = ref(false);
onMounted(() => (mounted.value = true));

/* --- geometry ----------------------------------------------------------- */

const height = ref(0);

/** Detent offsets in px from the fully-open position, ascending (0 = tallest). */
const stops = computed(() => {
  const unique = [...new Set(props.detents)]
    .filter((d) => d > 0 && d <= 1)
    .sort((a, b) => b - a);
  const fractions = unique.length ? unique : [1];
  return fractions.map((f) => height.value * (1 - f));
});

/** Where a closed sheet sits: entirely below the fold. */
const closedY = computed(() => height.value);

/* --- the spring --------------------------------------------------------- */

/**
 * The resting value before the sheet has been measured. It has to be far
 * enough down to be off any plausible screen: the element renders once at this
 * offset so its height can be read, and starting that first frame at 0 would
 * flash a fully-open sheet for the frame before it is parked.
 */
const OFFSCREEN = 10000;

let pendingClose = false;

const {
  value: y,
  to: springTo,
  set: springSet,
  track: springTrack,
  spring,
} = useSpring(OFFSCREEN, {
  preset: "sheet",
  onRest: (value) => {
    if (pendingClose) {
      pendingClose = false;
      isOpen.value = false;
      return;
    }
    const index = stops.value.indexOf(value);
    if (index !== -1) {
      const fraction = height.value ? 1 - value / height.value : 1;
      emit("detent", Number(fraction.toFixed(4)));
    }
  },
});

/**
 * The scrim tracks the sheet rather than fading on its own clock, so dragging
 * the sheet halfway down lightens the page by half. The two are one gesture
 * and the member is driving both.
 */
const scrimOpacity = computed(() => {
  // Before measurement the sheet is parked off-screen, so the page behind it
  // is not covered by anything and must not be dimmed either.
  if (!height.value) return 0;
  return 1 - Math.min(Math.max(y.value / height.value, 0), 1);
});

function measure() {
  const el = panel.value;
  if (!el) return;
  height.value = el.offsetHeight;
}

/** Open: measure, park below the fold, then spring up to the tallest detent. */
watch(
  isOpen,
  async (open) => {
    if (!open) return;
    await nextTick();
    measure();
    springSet(height.value);
    // A second frame so the browser paints the closed position before the
    // spring starts — setting and animating in the same tick makes the sheet
    // appear already halfway up.
    requestAnimationFrame(() => springTo(stops.value[0] ?? 0));
  },
  { immediate: true },
);

/* --- the gesture -------------------------------------------------------- */

let grabbedAt = 0;

useDrag(handle, {
  axis: "y",
  threshold: 4,
  onStart: () => {
    // Paused, not stopped: pausing keeps the current velocity, so catching a
    // sheet that is still moving continues from what it was doing instead of
    // snapping to a standstill under the finger.
    spring.pause();
    grabbedAt = y.value;
  },
  onMove: (state) => {
    const top = stops.value[stops.value.length - 1] ?? 0;
    const raw = grabbedAt + state.dy;

    let next = raw;
    if (raw < top) {
      // Above the tallest detent there is nothing to reveal, so resist.
      next = top + rubberband(raw - top, height.value || 1);
    } else if (!props.dismissible && raw > (stops.value[0] ?? 0)) {
      // A sheet that cannot be dismissed still has to acknowledge a downward
      // drag, or it reads as frozen.
      const floor = stops.value[0] ?? 0;
      next = floor + rubberband(raw - floor, height.value || 1);
    }

    springTrack(next);
  },
  onEnd: (state) => {
    const candidates = props.dismissible
      ? [...stops.value, closedY.value]
      : [...stops.value];

    const target = projectToDetent(y.value, state.vy, candidates);

    if (props.dismissible && target === closedY.value) {
      pendingClose = true;
    } else {
      haptics.impact();
    }

    // The release velocity becomes the spring's initial velocity — this line
    // is the seam between the finger and the animation, and without it the
    // sheet stops dead the instant the finger lifts and then sets off again.
    springTo(target, { velocity: state.vy });
  },
  onCancel: () => {
    springTo(stops.value[0] ?? 0);
  },
});

function dismiss() {
  if (!props.dismissible) return;
  pendingClose = true;
  springTo(closedY.value);
}
</script>

<template>
  <Teleport to="body" :disabled="!mounted">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center pb-[var(--keyboard-inset,0px)]"
    >
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
        :aria-label="title"
        tabindex="-1"
        class="relative flex w-full flex-col overflow-hidden bg-surface-overlay shadow-sheet sm:max-w-lg"
        :style="{
          maxHeight,
          // translate3d rather than translateY: it promotes the sheet to its
          // own compositor layer, so a 60fps drag does not repaint the page
          // behind it on every frame.
          transform: `translate3d(0, ${y}px, 0)`,
          borderTopLeftRadius: 'var(--radius-sheet)',
          borderTopRightRadius: 'var(--radius-sheet)',
        }"
      >
        <!-- The drag region. touch-action: none because this element owns the
             vertical gesture outright; the scrolling body below does not. -->
        <div
          ref="handle"
          class="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing"
        >
          <div v-if="grabber" class="flex justify-center pb-1 pt-2.5">
            <span class="sheet-grabber" aria-hidden="true"></span>
          </div>

          <div
            v-if="title || $slots.header || dismissible"
            class="flex items-start gap-4 px-5 pb-3"
            :class="grabber ? 'pt-1' : 'pt-4'"
          >
            <div class="min-w-0 flex-1">
              <slot name="header">
                <h2 v-if="title" class="text-title-3 text-ink">{{ title }}</h2>
                <p v-if="description" class="mt-1 text-sm text-muted">
                  {{ description }}
                </p>
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
        </div>

        <!-- pb-safe on the body as well as the footer: with no footer the
             last row would otherwise sit under the home indicator, where it
             is visible but not tappable. -->
        <div
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5"
          :class="$slots.footer ? '' : 'pb-safe'"
        >
          <slot />
        </div>

        <div
          v-if="$slots.footer"
          class="shrink-0 border-t border-subtle bg-surface-sunken px-5 py-4 pb-safe"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
