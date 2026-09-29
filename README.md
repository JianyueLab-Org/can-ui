# can-ui

The **Cerulean Aviation Network** design system — one set of tokens, one motion layer and one set
of Vue primitives, shared by `can-web`, `can-dev`, `can-radar`, `can-exam`, `can-efb` and
`can-controller`.

It replaces six byte-identical copies of the same `components/ui/` directory and six ~1,220-line
copies of the same `globals.css`.

```bash
bun install
bun run dev      # the gallery on http://localhost:4327
```

The gallery **is** the documentation: `/` is every component, `/motion` is the spring engine with
its two parameters on sliders, `/tokens` is the palette, the type scale, the materials and every icon.

## Using it

The package lives on **GitHub Packages**, whose npm registry requires a token
**even for a public package** — that is GitHub's rule, not ours, and it is the one
sharp edge of this distribution choice. Each consuming site needs an `.npmrc`:

```ini
# .npmrc — commit this; it names a registry, not a credential.
@jianyuelab-org:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

`${GITHUB_TOKEN}` is read from the environment at install time, so the file itself
carries no secret. Locally that is a personal token with `read:packages`; in CI it is
the workflow's own `secrets.GITHUB_TOKEN`, which already has it.

```bash
bun add @jianyuelab-org/can-ui
```

Then four lines in the consuming site.

**1. The stylesheet**, once, replacing the site's own `globals.css`:

```css
/* src/styles/globals.css */
@import "@jianyuelab-org/can-ui/styles";

/* anything genuinely local goes after — can-radar's Leaflet block, a page rule */
```

**2. `noExternal`**, because the package ships `.vue`/`.ts` source rather than a build:

```js
// astro.config.mjs
export default defineConfig({
  vite: { ssr: { noExternal: ["@jianyuelab-org/can-ui"] } },
});
```

Without it, SSR tries to `require` a `.vue` file and the first render 500s.

**3. The no-flash theme script** in every layout's `<head>`, before any content:

```astro
---
import ThemeScript from "@jianyuelab-org/can-ui/components/ThemeScript.astro";
---

<head>
  <ThemeScript />
</head>
```

Then:

```vue
<script setup lang="ts">
import { Button, Card, Sheet, StatCard } from "@jianyuelab-org/can-ui";
</script>
```

## What is in it

| Group          | Components                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Brand          | `Logo` `LogoMark`                                                                                                              |
| Primitives     | `Icon` `Avatar` `Spinner` `Skeleton` `Button` `Badge` `Card`                                                                   |
| Forms          | `Input` `Textarea` `Select` `Toggle` `Segmented`                                                                               |
| Page furniture | `AlertBox` `EmptyState` `PageHeader` `StatCard` `DataTable` `ListGroup` `ListRow`                                              |
| Surfaces       | `Toolbar` `Dialog` `Sheet` `Drawer` `Popover`                                                                                  |
| Chrome         | `CanFrame` `AccountMenu` `NoAccess` `SidebarNav` `CommandPalette` `ThemeLangControls` `ThemeToggle` `NetworkMenu` `SiteFooter` |

Plus `ThemeScript.astro` (the no-flash inline script), the motion layer — `useSpring`, `useDrag`,
`Spring`, `Spring2D`, `project`, `rubberband`, `projectToDetent`, `shouldCommit`,
`VelocityTracker` — and the composables `useOverlay`, `usePress`, `useIsDark`, `toggleTheme`,
`useReducedMotion`, `useReducedTransparency`, `useHighContrast`, `useCoarsePointer`, `haptics`.

**The chrome components are the site frame.** `CanFrame` is the one frame every site renders:
four layouts, the same five parts in the same order. It takes data and messages as props and
calls one endpoint, the site's own `/api/v1/auth/signout`. `AppShell` and `SiteHeader` are
deprecated and removed in 27.2.0.

**The identity lives here too.** `src/assets/logo/` carries the twelve official files —
horizontal/vertical × black/white × Chinese/Chinese+English/English — plus six generated
`currentColor` variants under `adaptive/`. `<Logo>` picks the right one from the current theme, so
no call site chooses between black and white; `<LogoMark>` is the symbol alone, inlined.

## Migrating a site

Every token name and every component prop is unchanged from can-web's, so this is an import
rewrite rather than a redesign:

1. Delete `src/components/ui/` and `src/components/icons.ts`.
2. Replace `src/styles/globals.css` with the import above plus whatever is genuinely local.
3. `@/components/ui/BaseButton.vue` → `@jianyuelab-org/can-ui`, dropping the `Base` prefix.
4. Add the `.npmrc` and the `noExternal` line.

The chrome goes too: one `src/components/Frame.vue` renders `CanFrame`. See
[The frame](#the-frame) and [AGENTS.md](AGENTS.md).

## The frame

```vue
<!-- src/components/Frame.vue -->
<script setup lang="ts">
import { CanFrame, originsFromEnv } from "@jianyuelab-org/can-ui";
import type { FrameUser, NavItem } from "@jianyuelab-org/can-ui";

defineProps<{
  locale: string;
  pathname: string;
  user: FrameUser | null;
  nav: NavItem[];
  messages: Record<string, unknown>;
}>();
const origins = originsFromEnv(import.meta.env);
</script>

<template>
  <CanFrame
    layout="tool"
    current="controller"
    :locale="locale"
    :pathname="pathname"
    :nav="nav"
    :user="user"
    :messages="messages"
    :origins="origins"
    after-sign-out="web"
  >
    <slot />
  </CanFrame>
</template>
```

`layout="rail"` also needs `RailScript.astro` in `<head>`, next to `ThemeScript.astro`.

Each site checks its ⌘K registry entries against its own routes:

```json
"check:pages": "can-ui-check-pages controller"
```

## Versions

`vXX.YY.ZZ`: year (rolling over in September), minor from 1, patch. Sites pin the exact version.
A published release opens a bump PR in every site repo (`.github/workflows/bump-consumers.yml`,
secret `CAN_UI_BUMP_TOKEN`). Sites add nothing for bumps.

## The design language, in five lines

- **Feedback on pointer-down, never on release.** The moment a control waits for touch-up to
  acknowledge a press, directness falls off a cliff.
- **Anything a finger can reach moves on a spring**, so it can be grabbed mid-flight and reversed.
  Everything else is CSS.
- **A release is projected, not snapped.** The target comes from where the momentum was heading,
  which is what makes a flick do something a slow drag does not.
- **Boundaries resist, they do not stop.** A hard stop reads as frozen.
- **Materials express hierarchy, and never stack.** Glass on the page; solid surfaces on the glass.

The reasoning behind each is in the source, next to the code it governs.

## Commands

```bash
bun run dev      # gallery on :4327
bun run lint     # format:check + astro check + vue-tsc + bun test
bun run build
bun test         # the pure modules: sites, pages, palette, frame, i18n, rail, sign-out, check:pages, springs
```

The gate is `bun run lint` then `bun run build`.
