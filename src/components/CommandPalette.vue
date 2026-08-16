<script setup lang="ts">
/**
 * ⌘K quick navigation.
 *
 * It searches **what is already in the rail** and nothing else. That is a
 * deliberate ceiling rather than a first version: searching members, flights
 * or documents needs an API, and a palette that sometimes searches the network
 * and sometimes only the menu is a palette nobody can predict. What it
 * replaces is a search box in can-web's top bar that was wired to nothing at
 * all — visibly a control, functionally a decoration.
 *
 * Add a route to the shell and it appears here; there is no second list to
 * keep in step.
 *
 * The keyboard contract is the one people already have from every other
 * palette: type to filter, ↑/↓ to move, Enter to go, Escape to leave. Escape
 * and focus-return come from `useOverlay`, so they cannot be forgotten.
 */
import { computed, ref, watch } from "vue";
import Icon from "./Icon.vue";
import { useOverlay } from "../composables/useOverlay";
import { createTranslator, CHROME_MESSAGES } from "../i18n";

export interface CommandItem {
  name: string;
  href: string;
  icon: string;
  /** Group label shown beside the name — the section it belongs to. */
  section?: string;
}

const props = withDefaults(
  defineProps<{
    open: boolean;
    items: CommandItem[];
    messages?: Record<string, unknown>;
  }>(),
  { messages: () => ({}) },
);

const emit = defineEmits<{
  "update:open": [boolean];
  /** Navigation is the site's to perform — see the note on `select`. */
  select: [CommandItem];
}>();

const t = createTranslator(props.messages, CHROME_MESSAGES);

const isOpen = computed({
  get: () => props.open,
  set: (value) => emit("update:open", value),
});

const query = ref("");
const highlighted = ref(0);
const input = ref<HTMLInputElement | null>(null);
const panel = useOverlay(isOpen, { initialFocus: input });

const results = computed(() => {
  const needle = query.value.trim().toLowerCase();
  if (!needle) return props.items;
  return props.items.filter(
    (item) =>
      item.name.toLowerCase().includes(needle) ||
      item.section?.toLowerCase().includes(needle) ||
      item.href.toLowerCase().includes(needle),
  );
});

// Reset on open rather than on close: resetting on close is visible, because
// the panel is still on screen while it animates out.
watch(isOpen, (open) => {
  if (open) {
    query.value = "";
    highlighted.value = 0;
  }
});

// A filter that shortens the list can leave the cursor past its end.
watch(results, (list) => {
  if (highlighted.value > list.length - 1) highlighted.value = 0;
});

function choose(item: CommandItem) {
  isOpen.value = false;
  emit("select", item);
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowDown") {
    event.preventDefault();
    highlighted.value = Math.min(
      highlighted.value + 1,
      results.value.length - 1,
    );
  } else if (event.key === "ArrowUp") {
    event.preventDefault();
    highlighted.value = Math.max(highlighted.value - 1, 0);
  } else if (event.key === "Enter") {
    event.preventDefault();
    const target = results.value[highlighted.value];
    if (target) choose(target);
  }
  // Escape belongs to useOverlay, which also returns focus to the trigger.
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-start justify-center px-4 pb-[var(--keyboard-inset,0px)] pt-16 sm:pt-24"
      role="dialog"
      aria-modal="true"
      :aria-label="t('search.label')"
    >
      <div
        class="animate-overlay-in absolute inset-0 bg-[var(--scrim)]"
        aria-hidden="true"
        @click="isOpen = false"
      ></div>

      <div
        ref="panel"
        tabindex="-1"
        class="animate-panel-in relative w-full max-w-lg overflow-hidden rounded-[var(--radius-sheet)] border border-subtle bg-surface-overlay shadow-sheet"
      >
        <div class="flex items-center gap-3 border-b border-subtle px-4">
          <Icon name="magnifyingGlass" class="size-5 shrink-0 text-faint" />
          <input
            ref="input"
            v-model="query"
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls="can-ui-palette-results"
            :placeholder="t('search.placeholder')"
            :aria-label="t('search.label')"
            class="h-12 min-w-0 flex-1 bg-transparent text-base text-ink outline-none placeholder:text-faint sm:text-sm"
            @keydown="onKeydown"
          />
          <button
            type="button"
            class="btn btn-ghost -mr-2 size-9 shrink-0 p-0"
            :aria-label="t('close')"
            @click="isOpen = false"
          >
            <Icon name="xMark" class="size-5" />
          </button>
        </div>

        <ul
          v-if="results.length"
          id="can-ui-palette-results"
          role="listbox"
          class="max-h-[calc(50dvh-var(--keyboard-inset,0px))] overflow-y-auto overscroll-contain p-2 sm:max-h-80"
        >
          <li
            v-for="(item, index) in results"
            :key="item.href"
            role="option"
            :aria-selected="index === highlighted"
          >
            <button
              type="button"
              tabindex="-1"
              :class="[
                'tap-row flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left text-sm transition-colors',
                index === highlighted
                  ? 'bg-surface-sunken text-ink'
                  : 'text-muted hover:bg-surface-sunken hover:text-ink',
              ]"
              @mouseenter="highlighted = index"
              @click="choose(item)"
            >
              <Icon :name="item.icon" class="size-4 shrink-0 text-faint" />
              <span class="truncate font-medium">{{ item.name }}</span>
              <span v-if="item.section" class="truncate text-xs text-faint">
                {{ item.section }}
              </span>
              <Icon
                name="arrowRight"
                class="ml-auto size-4 shrink-0 text-faint"
              />
            </button>
          </li>
        </ul>
        <p v-else class="px-4 py-8 text-center text-sm text-muted">
          {{ t("search.noResults") }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
