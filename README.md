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
its two parameters on sliders, `/tokens` is the palette, the type scale, the materials and all 62
icons.

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

| Group          | Components                                                                        |
| -------------- | --------------------------------------------------------------------------------- |
| Brand          | `Logo` `LogoMark`                                                                 |
| Primitives     | `Icon` `Avatar` `Spinner` `Skeleton` `Button` `Badge` `Card`                      |
| Forms          | `Input` `Textarea` `Select` `Toggle` `Segmented`                                  |
| Page furniture | `AlertBox` `EmptyState` `PageHeader` `StatCard` `DataTable` `ListGroup` `ListRow` |
| Surfaces       | `Toolbar` `Dialog` `Sheet` `Drawer` `Popover`                                     |
| Chrome         | `AppShell` `SidebarNav` `CommandPalette` `ThemeLangControls` `ThemeToggle`        |

Plus `ThemeScript.astro` (the no-flash inline script), the motion layer — `useSpring`, `useDrag`,
`Spring`, `Spring2D`, `project`, `rubberband`, `projectToDetent`, `shouldCommit`,
`VelocityTracker` — and the composables `useOverlay`, `usePress`, `useIsDark`, `toggleTheme`,
`useReducedMotion`, `useReducedTransparency`, `useHighContrast`, `useCoarsePointer`, `haptics`.

**The chrome components are the site frame** — sidebar, top bar, ⌘K palette, account menu — and
they take data and emit events: no API call, no site import, no hardcoded route. Sign-out is an
`@signout` event, the brand is a slot, the account links are a prop, and every string comes from
the `messages` dictionary the site already builds. `ThemeLangControls` alone was 243 lines
duplicated byte-for-byte across all six sites.

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

The chrome goes too. `AppShell` now takes its data as props and emits `@signout` instead of
calling can-api, so the site keeps the one line it always owned — the sign-out request and where
to send the member afterwards — and drops the other five hundred. `AppRail` stays in can-efb: it
exists in one site, so there is nothing to de-duplicate. See [AGENTS.md](AGENTS.md).

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
bun test         # the spring solver's physics, headless
```

The gate is `bun run lint` then `bun run build`.
