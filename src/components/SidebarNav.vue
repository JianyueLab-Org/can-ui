<script setup lang="ts">
/**
 * The rail's navigation: a list of links, some of which are collapsible
 * sections, plus pinned cross-links at the foot.
 *
 * Two things here are worth more than they look.
 *
 * **`isCurrentPath` is prefix-aware but not naively so.** A link to `/exams`
 * must highlight on `/exams/papers`, but a link to `/exams/` — a section root
 * — must *not* highlight on every route beneath it, or the dashboard entry is
 * lit on every page in the section and stops meaning anything. The trailing
 * slash is the opt-out, and the character check after the prefix is what stops
 * `/exam` matching `/examples`.
 *
 * **Which sections start open is derived from the current path**, so arriving
 * deep in a section shows you where you are rather than a closed accordion you
 * have to guess into. can-web's copy computed that once during setup, which
 * meant a `navigation` array that changed later — a locale switch, a rail
 * built from a computed — never re-derived it and the active section silently
 * stopped opening. Here it is a watcher.
 *
 * A member who has explicitly opened or closed a section keeps that choice:
 * re-deriving would fight them every time the prop identity changed.
 */
import { reactive, watch } from "vue";
import Icon from "./Icon.vue";
import type { NavItem, NavSecondary } from "../nav";

const props = defineProps<{
  navigation: NavItem[];
  /** Current path — `Astro.url.pathname` at the call site. */
  pathname: string;
  secondary?: NavSecondary;
}>();

function isCurrentPath(href?: string): boolean {
  if (!href || href === "#" || href.startsWith("http")) return false;
  if (href.endsWith("/")) {
    return props.pathname === href || props.pathname === href.slice(0, -1);
  }
  if (props.pathname === href) return true;
  if (props.pathname.startsWith(href)) {
    const nextChar = props.pathname[href.length];
    return !nextChar || nextChar === "/";
  }
  return false;
}

function sectionActive(item: NavItem): boolean {
  return (item.children ?? []).some((child) => isCurrentPath(child.href));
}

const openSections = reactive<Record<string, boolean>>({});
const touched = new Set<string>();

watch(
  () => [props.navigation, props.pathname] as const,
  () => {
    for (const item of props.navigation) {
      if (!item.children) continue;
      // Only sections the member has not touched follow the route.
      if (!touched.has(item.name))
        openSections[item.name] = sectionActive(item);
    }
  },
  { immediate: true, deep: true },
);

function toggleSection(name: string) {
  touched.add(name);
  openSections[name] = !openSections[name];
}

const baseItem =
  "group flex w-full items-center gap-x-3 rounded-control px-2.5 py-2 text-sm font-medium transition-colors duration-150";
const activeItem = "bg-surface-raised text-can shadow-card";
const idleItem = "text-muted hover:bg-surface-raised hover:text-ink";
</script>

<template>
  <nav class="flex flex-1 flex-col" aria-label="Sidebar">
    <ul role="list" class="-mx-1 space-y-0.5">
      <li v-for="item in navigation" :key="item.name">
        <!-- Leaf -->
        <a
          v-if="!item.children"
          :href="item.href"
          :aria-current="isCurrentPath(item.href) ? 'page' : undefined"
          :class="[baseItem, isCurrentPath(item.href) ? activeItem : idleItem]"
        >
          <Icon
            :name="item.icon"
            :class="[
              'size-5 shrink-0',
              isCurrentPath(item.href)
                ? 'text-can'
                : 'text-faint group-hover:text-muted',
            ]"
          />
          <span class="truncate">{{ item.name }}</span>
        </a>

        <!-- Section -->
        <div v-else>
          <button
            type="button"
            :aria-expanded="openSections[item.name] ? 'true' : 'false'"
            :class="[baseItem, sectionActive(item) ? activeItem : idleItem]"
            @click="toggleSection(item.name)"
          >
            <Icon
              :name="item.icon"
              :class="[
                'size-5 shrink-0',
                sectionActive(item)
                  ? 'text-can'
                  : 'text-faint group-hover:text-muted',
              ]"
            />
            <span class="truncate">{{ item.name }}</span>
            <!-- The chevron rotates rather than swapping glyph: the rotation
                 is the same gesture as the disclosure and points where the
                 content is going. -->
            <Icon
              name="chevronRight"
              :class="[
                'ml-auto size-4 shrink-0 text-faint transition-transform duration-200 ease-[var(--ease-out-quint)]',
                openSections[item.name] ? 'rotate-90' : '',
              ]"
            />
          </button>

          <!-- The 0fr→1fr grid row is the one way to transition to a height
               the browser has to measure. `v-show` rather than `v-if` because
               the children have to exist for the row to have a height to
               animate to. The reduced-motion block collapses the duration,
               which leaves an instant open — correct, not degraded. -->
          <div
            class="grid transition-[grid-template-rows] duration-200 ease-[var(--ease-out-quint)]"
            :style="{
              gridTemplateRows: openSections[item.name] ? '1fr' : '0fr',
            }"
          >
            <ul
              role="list"
              class="overflow-hidden"
              :aria-hidden="openSections[item.name] ? undefined : 'true'"
            >
              <li
                v-for="subItem in item.children"
                :key="subItem.name"
                class="first:mt-0.5"
              >
                <a
                  :href="subItem.href"
                  :tabindex="openSections[item.name] ? undefined : -1"
                  :aria-current="
                    isCurrentPath(subItem.href) ? 'page' : undefined
                  "
                  :class="[
                    'tap-row ml-4 flex items-center truncate border-l-2 py-1.5 pl-4 pr-2 text-sm transition-colors duration-150',
                    isCurrentPath(subItem.href)
                      ? 'border-can font-semibold text-can'
                      : 'border-[var(--border-subtle)] text-muted hover:border-strong hover:text-ink',
                  ]"
                >
                  {{ subItem.name }}
                </a>
              </li>
            </ul>
          </div>
        </div>
      </li>
    </ul>

    <!-- Pinned cross-links -->
    <div v-if="secondary?.items.length" class="mt-auto pt-6">
      <h2 class="text-eyebrow px-2.5 pb-2 text-faint">
        {{ secondary.label }}
      </h2>
      <ul role="list" class="-mx-1 space-y-0.5">
        <li v-for="item in secondary.items" :key="item.name">
          <a
            :href="item.href"
            :aria-current="isCurrentPath(item.href) ? 'page' : undefined"
            :class="[
              baseItem,
              isCurrentPath(item.href) ? activeItem : idleItem,
            ]"
          >
            <Icon
              v-if="item.icon"
              :name="item.icon"
              :class="[
                'size-4 shrink-0',
                isCurrentPath(item.href)
                  ? 'text-can'
                  : 'text-faint group-hover:text-muted',
              ]"
            />
            <span class="truncate">{{ item.name }}</span>
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>
