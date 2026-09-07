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
import { createTranslator, CHROME_MESSAGES } from "../i18n";

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
    /**
     * Dictionary for the strings this component renders itself — currently the
     * dismiss control's accessible name. can-ui never picks a locale; the site
     * owns the dictionary and passes it in. See `src/i18n.ts`.
     */
    messages?: Record<string, unknown>;
  }>(),
  {
    side: "left",
    width: "18rem",
    dismissible: true,
    messages: () => ({}),
  },
);

const emit = defineEmits<{ "update:open": [boolean]; close: [] }>();

const t = createTranslator(props.messages, CHROME_MESSAGES);

const isOpen = computed({
  get: () => props.open,
  set: (value) => {
    emit("update:open", value);
    if (!value) emit("close");
  },
});

/**
 * The panel stays mounted for the length of its exit, so `visible` — not the
 * `open` prop — is what `v-if` reads and what `useOverlay` is bound to. Binding
 * the scroll lock and the focus trap to the prop instead would release both the
 * instant the parent flipped it, while the drawer was still sliding out.
 */
const visible = ref(false);

/**
 * Every close funnels through `requestClose`.
 *
 * The spring-out used to live only in `dismiss()` and the drag's `onEnd`, so
 * two of the four close paths animated and two did not. Escape goes through
 * `useOverlay`, which assigns `isOpen.value = false` outright; a parent's own
 * handler — a "save" button, much the commonest programmatic close — flips the
 * prop. Both landed straight on `v-if` and tore the element out in the same
 * tick, so the panel vanished with no slide and no scrim fade while the ×
 * beside it animated. Exit by the same edge is the reason this component
 * exists, so it has to hold for all four.
 */
const overlayOpen = computed({
  get: () => visible.value,
  set: (value) => {
    if (!value) requestClose();
  },
});

const panel = useOverlay(overlayOpen, {
  dismissible: () => props.dismissible,
});
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
/**
 * `pendingClose` — the exit should end by telling the parent.
 * `closing`      — the parent already knows (it flipped the prop, or Escape
 *                  did); the exit should end by unmounting and nothing more.
 * Keeping them apart is what stops an externally-driven close emitting
 * `update:open` straight back at the parent that asked for it.
 */
let pendingClose = false;
let closing = false;

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
      visible.value = false;
      isOpen.value = false;
      return;
    }
    if (closing) {
      closing = false;
      visible.value = false;
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
  () => props.open,
  async (open) => {
    if (open) {
      // Re-opened mid-exit: spring back from wherever it got to rather than
      // re-parking it off-screen, which would restart the entrance from the
      // edge and throw away the velocity it already carries.
      const resuming = visible.value;
      pendingClose = false;
      closing = false;
      visible.value = true;
      await nextTick();
      measure();
      if (resuming) {
        springTo(0);
        return;
      }
      springSet(width.value);
      requestAnimationFrame(() => springTo(0));
      return;
    }
    // Closed from outside. Escape's own emit also lands here, by which point
    // the panel is off-screen already and there is nothing left to animate —
    // hence the `pendingClose` guard.
    if (!visible.value || pendingClose || closing) return;
    closing = true;
    springTo(width.value);
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

/** Spring out, then tell the parent once the panel has actually left. */
function requestClose() {
  if (!visible.value || pendingClose) return;
  closing = false;
  pendingClose = true;
  springTo(width.value);
}

function dismiss() {
  if (!props.dismissible) return;
  requestClose();
}
</script>

<template>
  <Teleport to="body" :disabled="!mounted">
    <div v-if="visible" class="fixed inset-0 z-50">
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
            :aria-label="t('close')"
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
