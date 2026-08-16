<script setup lang="ts">
/**
 * A panel anchored to the control that opened it — a menu, a filter, a detail
 * card.
 *
 * **It scales from its trigger, not from its own centre.** `transform-origin`
 * is set to the corner nearest the button, so the panel visibly grows *out of*
 * the thing that was pressed. That one property is most of what makes a
 * popover feel connected to its control rather than dropped on top of the
 * page, and it is the difference between "this belongs to that button" and
 * "something appeared".
 *
 * **It materialises rather than fading.** The blur radius and the scale animate
 * together, so the glass reads as arriving rather than as a picture of glass
 * becoming visible.
 *
 * **It does not dim the page.** A popover is a *parallel* surface: the member
 * is still in the flow they were in, and dimming everything else would claim
 * otherwise. Translucency and offset carry the hierarchy instead. If the task
 * genuinely blocks — it must be answered before anything else — that is a
 * Dialog, not this.
 *
 * Positioned `fixed` and teleported to the body, so it is not clipped by a
 * card's `overflow: hidden` or shifted by a transformed ancestor.
 */
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useOverlay } from "../composables/useOverlay";

type Placement = "bottom-start" | "bottom-end" | "top-start" | "top-end";

const props = withDefaults(
  defineProps<{
    placement?: Placement;
    /** Gap between the trigger and the panel, in px. */
    offset?: number;
    /** Panel width. Anything CSS accepts. */
    width?: string;
    label?: string;
  }>(),
  { placement: "bottom-start", offset: 8, width: "16rem" },
);

/**
 * Uncontrolled by default, controlled when a parent binds `v-model:open`.
 *
 * Unlike a Dialog — which is opened from somewhere else entirely and therefore
 * has to be told — a Popover owns the button that opens it. Forcing every call
 * site to declare a ref for state that never leaves this component would be
 * boilerplate at each of them, and the one thing worse than a menu with no
 * state is thirty menus each keeping their own copy of it by hand.
 */
const isOpen = defineModel<boolean>("open", { default: false });

const emit = defineEmits<{ close: [] }>();

watch(isOpen, (open) => {
  if (!open) emit("close");
});

// No scroll lock: the page behind a popover is still live, and locking it says
// otherwise. The focus trap stays — once focus is inside the panel, Tab should
// cycle it rather than walk off into a page the member cannot see moving.
const panel = useOverlay(isOpen, { lockScroll: false });
const trigger = ref<HTMLElement | null>(null);
const mounted = ref(false);

const style = ref<Record<string, string>>({});

/** Which corner of the panel sits against the trigger. */
const resolved = ref<Placement>(props.placement);

const origin = computed(() => {
  const [side, align] = resolved.value.split("-") as [
    "bottom" | "top",
    "start" | "end",
  ];
  return {
    "--origin-x": align === "start" ? "0%" : "100%",
    "--origin-y": side === "bottom" ? "0%" : "100%",
  };
});

function place() {
  const anchor = trigger.value;
  const el = panel.value;
  if (!anchor || !el) return;

  const rect = anchor.getBoundingClientRect();
  const panelRect = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let [side, align] = props.placement.split("-") as [
    "bottom" | "top",
    "start" | "end",
  ];

  // Flip rather than clip. A panel that runs off the bottom of the screen and
  // scrolls internally is worse than one that opens upward: the member cannot
  // see that there is more, and the trigger they just pressed is off-screen.
  if (side === "bottom" && rect.bottom + props.offset + panelRect.height > vh) {
    if (rect.top - props.offset - panelRect.height > 0) side = "top";
  } else if (side === "top" && rect.top - props.offset - panelRect.height < 0) {
    if (rect.bottom + props.offset + panelRect.height < vh) side = "bottom";
  }
  if (align === "start" && rect.left + panelRect.width > vw) align = "end";
  else if (align === "end" && rect.right - panelRect.width < 0) align = "start";

  resolved.value = `${side}-${align}` as Placement;

  const top =
    side === "bottom"
      ? rect.bottom + props.offset
      : rect.top - props.offset - panelRect.height;
  const left = align === "start" ? rect.left : rect.right - panelRect.width;

  style.value = {
    top: `${Math.round(top)}px`,
    // Kept inside the viewport with an 8px margin, so a panel anchored to a
    // control at the very edge is still fully readable.
    left: `${Math.round(Math.min(Math.max(left, 8), vw - panelRect.width - 8))}px`,
    width: props.width,
    // The panel must never be wider than the screen it is anchored on. Without
    // this a 20rem popover on a 320px phone runs off the right edge, and the
    // clamp above can only push it left — it cannot make it fit.
    maxWidth: "calc(100vw - 1rem)",
  };
}

function toggle() {
  isOpen.value = !isOpen.value;
}

function onDocumentPointerDown(event: PointerEvent) {
  if (!isOpen.value) return;
  const target = event.target as Node;
  if (panel.value?.contains(target) || trigger.value?.contains(target)) return;
  isOpen.value = false;
}

// Re-placed rather than closed on scroll: closing a menu because the page moved
// under it loses whatever the member was in the middle of choosing.
let frame = 0;
function onViewportChange() {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    place();
  });
}

watch(isOpen, async (open) => {
  if (open) {
    await nextTick();
    place();
    document.addEventListener("pointerdown", onDocumentPointerDown, true);
    window.addEventListener("scroll", onViewportChange, true);
    window.addEventListener("resize", onViewportChange);
  } else {
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
    window.removeEventListener("scroll", onViewportChange, true);
    window.removeEventListener("resize", onViewportChange);
  }
});

onMounted(() => (mounted.value = true));

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
  if (typeof document === "undefined") return;
  document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  window.removeEventListener("scroll", onViewportChange, true);
  window.removeEventListener("resize", onViewportChange);
});
</script>

<template>
  <span ref="trigger" class="inline-flex">
    <slot name="trigger" :toggle="toggle" :open="isOpen" />
  </span>

  <Teleport to="body" :disabled="!mounted">
    <div
      v-if="isOpen"
      ref="panel"
      role="dialog"
      :aria-label="label"
      tabindex="-1"
      class="animate-materialize material-regular fixed z-50 overflow-hidden rounded-[var(--radius-sheet)] shadow-popover"
      :style="{ ...style, ...origin }"
    >
      <!-- Solid content on the material, never another material. -->
      <div
        class="vibrant max-h-[70dvh] overflow-y-auto overscroll-contain p-1.5"
      >
        <slot :close="() => (isOpen = false)" />
      </div>
    </div>
  </Teleport>
</template>
