<script setup lang="ts">
/**
 * The centred modal, shell included — backdrop, header with the title and the
 * × button, a scrolling body, `#footer` for the actions and `#toolbar` for
 * chrome that must not scroll.
 *
 * Do not hand-roll another. The copies this replaces had already drifted (85
 * vs 88 dvh, 92 vs 95 vw) and all carried an `aria-label` on the wrapper where
 * an `aria-labelledby` pointing at the visible heading belonged — so the
 * dialog announced one name while showing another.
 *
 * It owns the `useOverlay` wiring, so it gets Escape, the scroll lock, the
 * focus trap and focus-return for free — including when it is **mounted
 * already open**, which is the case a hand-rolled watcher silently skips.
 *
 * **A modal dims and pushes back**, rather than merely floating. That pairing
 * is what says "this task is the only thing happening": the scrim removes the
 * page as a target and the scale removes it as a plane. A panel that should
 * *not* block — a parallel inspector — is a Popover or a Sheet, not this.
 *
 * A dialog that must be answered rather than dismissed passes
 * `:dismissible="false"`. Use that sparingly: a confirmation nobody can walk
 * away from is only warranted for something genuinely destructive and
 * irreversible, and overusing it trains members to click through.
 */
import { computed, onMounted, ref, useId, watch } from "vue";
import Icon from "./Icon.vue";
import { useOverlay } from "../composables/useOverlay";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    description?: string;
    size?: "sm" | "md" | "lg" | "xl";
    /** Escape and a backdrop click dismiss. Off for a decision. */
    dismissible?: boolean;
  }>(),
  { size: "md", dismissible: true },
);

const emit = defineEmits<{
  "update:open": [boolean];
  close: [];
}>();

// Every dismissal path leaves through this one ref, so `v-model:open` and
// `@close` cannot disagree about whether the dialog is shut.
const isOpen = computed({
  get: () => props.open,
  set: (value) => {
    emit("update:open", value);
    if (!value) emit("close");
  },
});

const titleId = useId();
const descId = useId();
// A getter rather than the value, so flipping `dismissible` on an open dialog
// takes effect — a form that becomes unsafe to abandon halfway through does
// exist, and re-mounting the dialog to change it would lose its state.
const panel = useOverlay(isOpen, { dismissible: () => props.dismissible });

const mounted = ref(false);
onMounted(() => (mounted.value = true));

const sizeClass = computed(
  () =>
    ({
      sm: "max-w-sm",
      md: "max-w-lg",
      lg: "max-w-2xl",
      xl: "max-w-4xl",
    })[props.size],
);

function dismiss() {
  if (!props.dismissible) return;
  isOpen.value = false;
}

// Backdrop clicks only, not clicks that started inside the panel and drifted
// out — a text selection that ends on the backdrop should not close the form
// it was selecting from.
const downOnBackdrop = ref(false);
function onBackdropDown(event: MouseEvent) {
  downOnBackdrop.value = event.target === event.currentTarget;
}
function onBackdropUp(event: MouseEvent) {
  if (downOnBackdrop.value && event.target === event.currentTarget) dismiss();
  downOnBackdrop.value = false;
}

watch(isOpen, (open) => {
  if (!open) downOnBackdrop.value = false;
});
</script>

<template>
  <Teleport to="body" :disabled="!mounted">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center p-0 pb-[var(--keyboard-inset,0px)] sm:items-center sm:p-4"
      @mousedown="onBackdropDown"
      @mouseup="onBackdropUp"
    >
      <!-- Dim to focus. The scrim is its own element rather than a background
           on the flex container, so it can fade on its own timing without
           taking the panel's scale with it. -->
      <div
        class="animate-overlay-in absolute inset-0 bg-[var(--scrim)]"
        aria-hidden="true"
      ></div>

      <div
        ref="panel"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="title ? titleId : undefined"
        :aria-describedby="description ? descId : undefined"
        tabindex="-1"
        :class="[
          'animate-panel-in relative flex max-h-[calc(92dvh-var(--keyboard-inset,0px))] w-full flex-col overflow-hidden bg-surface-overlay shadow-sheet',
          'rounded-t-[var(--radius-sheet)] sm:rounded-[var(--radius-sheet)]',
          sizeClass,
        ]"
      >
        <div
          v-if="title || $slots.header || dismissible"
          class="flex items-start gap-4 border-b border-subtle px-5 py-4"
        >
          <div class="min-w-0 flex-1">
            <slot name="header">
              <h2 v-if="title" :id="titleId" class="text-title-3 text-ink">
                {{ title }}
              </h2>
              <p
                v-if="description"
                :id="descId"
                class="mt-1 text-sm text-muted"
              >
                {{ description }}
              </p>
            </slot>
          </div>
          <button
            v-if="dismissible"
            type="button"
            class="btn btn-ghost -mr-1.5 -mt-1 size-8 p-0"
            aria-label="Close"
            @click="dismiss"
          >
            <Icon name="xMark" class="size-4" />
          </button>
        </div>

        <!-- Chrome that must stay put while the body scrolls — a tab bar, a
             search field. -->
        <div v-if="$slots.toolbar" class="border-b border-subtle px-5 py-3">
          <slot name="toolbar" />
        </div>

        <!-- overscroll-contain so reaching the end of this list does not chain
             the scroll to the page behind the backdrop. -->
        <div
          class="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"
        >
          <slot />
        </div>

        <div
          v-if="$slots.footer"
          class="flex flex-wrap items-center justify-end gap-3 border-t border-subtle bg-surface-sunken px-5 py-4 pb-safe"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>
