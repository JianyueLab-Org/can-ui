# AGENTS.md

This file provides guidance to Claude Code (claude.ai/code) and other agents working in this
repository. `CLAUDE.md` is a symlink to it — edit **this** file; a tool that replaces rather than
appends will otherwise turn the link into a regular file and quietly fork the two names apart.

## What this is

**can-ui** is the Cerulean Aviation Network design system: one set of tokens, one motion layer and
one set of Vue primitives, shared by every web component on the network.

It exists because that set already existed **six times**. `can-web`, `can-dev`, `can-radar`,
`can-exam`, `can-efb` and `can-controller` each carry a `src/components/ui/` directory and a
~1,220-line `src/styles/globals.css`, and the overlapping files are byte-identical — `BaseButton`,
`BaseCard`, `BaseBadge`, `AlertBox`, `Icon` and `ThemeLangControls` do not differ by a character
between can-web, can-controller and can-exam. Six copies that agree today are six copies that
disagree after the next fix, and the drift is invisible: each site's CI only ever builds its own.

The icon tables had already started: 62 distinct glyph names across the six `icons.ts` files,
each site having added what its own pages needed. They did not conflict — but only because nobody
had yet edited one.

## The adoption contract

**Every token name that already existed keeps its spelling.** `--color-airwaysn`, `bg-surface`,
`text-ink`, `text-muted`, `border-subtle`, `rounded-card`, `.btn-primary`, `.badge-info`,
`.skeleton`, `.data-table` — all unchanged. `src/styles/tokens.css` is a **superset** of can-web's
`globals.css`, not a replacement for it.

**Component props are unchanged too.** `Button`, `Card`, `Badge`, `Input`, `Select`, `Toggle`,
`DataTable`, `StatCard`, `PageHeader`, `EmptyState`, `Skeleton`, `Spinner`, `AlertBox` and
`Icon` take exactly what `Base*` took in can-web. `Dialog` gains `v-model:open`.

That is deliberate and it is the whole migration strategy: a design system that renames things is
a design system nobody adopts, because adopting it becomes a rewrite of every page rather than a
change of import path. Migrating a site is:

1. delete its `src/components/ui/` and its `src/components/icons.ts`;
2. replace its `src/styles/globals.css` with `@import "@jianyuelab-org/can-ui/styles";` plus whatever is genuinely
   local (can-radar's Leaflet block, a page-specific rule);
3. rewrite the imports — `@/components/ui/BaseButton.vue` → `can-ui`, dropping the `Base` prefix.

Nothing else should have to change. If something does, that is a bug in this repo.

## Layout

```
src/
  styles/      tokens.css · base.css · components.css · motion.css → index.css
  motion/      the spring engine, momentum projection, gesture tracking
  composables/ useOverlay · usePress · usePreferences · useTheme · haptics
  components/  31 Vue components + ThemeScript.astro
  assets/logo/ the identity — 12 official files + 6 generated adaptive ones
  icons.ts     the union of all six sites' icon tables — 62 glyphs
  i18n.ts      createTranslator + the chrome's own string keys
  nav.ts       NavItem / NavSecondary / Workspace — the shell's data shapes
  demo/        the gallery's islands (not exported)
  pages/       the gallery: / · /motion · /tokens · /brand · /shell
```

`src/index.ts` is the barrel. `src/demo/` and `src/pages/` are the gallery and are **not** part of
the package's public surface — `package.json`'s `exports` map does not reach them.

## The rules that are load-bearing

### Motion: CSS for what nobody can touch, springs for everything else

This is the split the whole `src/motion/` directory exists to enforce, and it is not stylistic.

A CSS transition has a duration and an end value fixed at the instant it starts. Interrupt it and
the browser's only move is to begin a _new_ transition from wherever the old one got to — **at zero
velocity**. The element stops dead and sets off again. That discontinuity is what an interface
feels like when it is arguing with you instead of following you, and it is unfixable from CSS.

A spring carries position _and_ velocity, so re-targeting mid-flight bends the motion rather than
restarting it.

So: **anything a finger can reach is a spring** — a sheet, a drawer, a segmented indicator, a drag,
a toggle knob. Anything else — an entrance, a page cross-fade, a colour settling, a hover — is CSS,
because it is cheaper and the fact that it cannot be interrupted does not matter.

Three details inside the engine are easy to undo by accident:

- **`Spring.to()` starts from `this.current`**, the presentation value — what is actually on
  screen. Starting from the logical target is what produces the visible jump on a fast double-tap.
- **Velocity is carried, not reset.** `spring.pause()` on grab, never `spring.stop()`: stopping
  zeroes the velocity, and catching a moving surface then visibly hitches.
- **The integration is analytic, not stepped.** A dropped frame produces a longer step rather than
  a wrong one, so 60Hz and 120Hz agree exactly — `spring.test.ts` asserts this to three decimal
  places. Replacing it with Euler integration would pass a casual look and fail on a 120Hz display.

`Spring2D` is two independent springs on purpose. One spring driven by 2D _distance_ desynchronises
the moment X and Y move at different speeds, curving the path and giving a purely horizontal flick
some vertical drift.

### Materials: never stack one on another

`.material-thin` / `.material-regular` / `.material-thick` are translucent layers with a
`backdrop-filter`. Weight encodes hierarchy — heavy separates structural regions, light floats over
content.

**A material must go on the page, and solid surfaces go on the material.** Two blurs of the same
backdrop compound into mud and the text on top loses its ground. `Popover` follows this: the glass
is the panel, and its contents are opaque.

Dark materials are _darker_ than the page, not lighter. A translucent white panel over a dark page
reads as a light leak.

### The three accessibility preferences are three different answers

- `prefers-reduced-motion` — no _vestibular_ motion, not no feedback. Springs jump to target
  (`Spring.to` checks it every call, live, not cached at import); slides become cross-fades;
  overshoot is dropped. Opacity and colour changes stay, because they carry the meaning.
- `prefers-reduced-transparency` — materials become near-solid and the blur is dropped **entirely**.
  A weakened blur is the worst of both: still a GPU cost, still text on a moving background.
- `prefers-contrast: more` — solid backgrounds and a defined border on anything that was separated
  by a tint or a shadow.

Handled in `motion.css` for the static cases and read by `usePreferences` where the decision is
structural.

### The theme has three modes, and the third one is the default

`light`, `dark`, `system` — and `system` is stored as **the absence of a stored
value** under the `theme` key. That is not a shortcut; it is the contract, and both
`ThemeScript.astro` (which runs before first paint, inline, with no access to this
module) and `useTheme` implement it independently. Anything that is not exactly
`"light"` or `"dark"` means follow the system, so a stray value fails safe.

A two-state toggle has a trapdoor in it: the first tap writes a preference that can
never be taken back, and the member is pinned to one appearance while their phone
goes on switching at sunset around them. Every platform this interface imitates
offers Light / Dark / Automatic, and offers Automatic because it is what most people
want. `ThemeToggle` and `ThemeLangControls` therefore **cycle** light → dark →
system: the explicit choices come first so the common tap still flips the appearance
at once, and `system` sits where somebody looking for it reaches it by pressing again.

**`mode` and `isDark` are different questions.** `mode` is the member's choice;
`isDark` is what is on screen, read off the `dark` class. In `system` mode the choice
does not change at sunset but the rendering does. Render from `isDark` (which logo,
which icon); show selection from `mode`.

Everything is installed once per document: one MutationObserver on the class, one
`prefers-color-scheme` listener, one `storage` listener. Before this, every component
that cared — a Logo, a ThemeToggle, a ThemeLangControls — built its own observer on
the same attribute.

Two failures that are invisible until you look for them, both fixed here:

- **The wipe used to reveal the old palette.** A view transition snapshots the new
  state in the same frame as the DOM change, and `body`'s colour transition has not
  moved at that instant — so the snapshot was painted in the _old_ colours, the wipe
  showed nothing changing, and the real palette popped in when the pseudo-elements
  were torn down. `html.theme-transitioning` now suppresses that transition; the wipe
  _is_ the easing.
- **Reduced motion used to get a hard flash.** The blanket rule collapses every
  transition, so with the wipe skipped the whole viewport changed brightness in one
  frame — which is one of the specific things that preference asks us to stop doing.
  A colour cross-fade is not vestibular motion, so `body` keeps a 200ms one inside the
  reduced-motion block.

### Mobile is a pointer question, not a width question

Every mobile rule in this system is gated on **`pointer: coarse`** — the primary input being a
finger — and not on a breakpoint. That is not a style preference: a 1024px iPad has every one of
these problems and a 375px desktop window has none of them. Gating on width gets both wrong.

**Touch targets.** Two utilities, and picking the wrong one is a real bug rather than a rough edge:

- `.tap-target` expands the hit rectangle by 10px with a pseudo-element, moving nothing. For a
  control whose visual size is the design — the 24px switch track, a dismiss ×. **Only where there
  is clear space around it:** two adjacent ones overlap and the later in DOM order silently
  swallows taps meant for the earlier.
- `.tap-row` raises the element itself to 44px. For rows in a list, where neighbours are flush and
  an expanded hit area would land on the wrong one.

Both are inert with a mouse. A 44px menu row on a desktop is wasted space, and a hit area reaching
10px past a button catches clicks aimed at the thing beside it.

Everything built before this pass was under 44px on touch: the switch at 24, the dismiss × at 24,
the segmented items at 28, the theme and language buttons at 36, the nav sub-links at 32. Only
`.btn` and `.input` had ever been given a floor.

**The scroll lock has to take the body out of flow.** `overflow: hidden` on `<html>` is the
textbook answer and does nothing on iOS Safari — the page scrolls behind the backdrop and
rubber-bands while a sheet is being dragged. `useOverlay` also sets `position: fixed` on the body
with a negative `top`, and **puts the scroll position back on release**; forgetting that half
sends the member to the top of the page every time they close a dialog.

**The keyboard is measured, not assumed.** A bottom-anchored dialog — which is what every dialog
becomes on a phone — is covered by the on-screen keyboard, because `position: fixed` resolves
against the layout viewport and the keyboard only resizes the _visual_ one. Chrome can be told
(`interactive-widget=resizes-content` in the viewport meta, which the layouts carry); Safari
cannot, so `useViewport` measures the difference and publishes `--keyboard-inset`. Dialog, Sheet
and CommandPalette pad by it. Any new overlay with a text field in it should too.

**A control that does not fit scrolls; it does not wrap or shrink.** Four CJK segments do not fit
on a 375px phone. Wrapping turns one control into two rows that stop reading as a single choice,
and shrinking makes the labels illegible before it makes them fit. `.segmented` scrolls, hides its
scrollbar, and the component scrolls the selected segment into view — so the state is never the
part that is off-screen.

**Bottom-anchored chrome clears the home indicator** with `pb-safe`, and that includes a sheet's
_body_ when it has no footer, or the last row is visible but not tappable.

### `@source` in index.css is not optional

Tailwind v4 auto-detects source files but **deliberately skips `node_modules`** — and this package
_is_ node_modules to every consumer. `src/styles/index.css` therefore carries an explicit
`@source "../"`, which overrides that exclusion and points at can-ui's own `src/`.

Without it, every utility that appears only inside a can-ui component is missing from the
consumer's build: `bg-info-bg` on AlertBox, `size-11` on a large icon button, the entire `sm:` half
of DataTable. It arrives as a handful of unrelated-looking spacing bugs rather than as an obvious
missing scan path, which is why it is worth the paragraph.

### Consumers must mark this package `noExternal`

The package ships **source** — `.vue`, `.ts`, `.css` — not a build. That is deliberate: every
consumer is the same Astro + Vue + Tailwind v4 toolchain, so a build step here would only be a
second compiler in the way. The cost is that Vite must be told not to externalise it:

```js
// astro.config.mjs in the consuming site
export default defineConfig({
  vite: { ssr: { noExternal: ["@jianyuelab-org/can-ui"] } },
});
```

Without it SSR tries to `require` a `.vue` file and the page 500s on first render.

### Dev port 4327

The ladder is fixed: 4321 can-web, 4322 can-dev, 4323 can-radar, 4324 can-efb, 4325 can-exam,
4326 can-controller, **4327 can-ui**. (can-exam still says 4324 in its `package.json` and is the one
that should move — can-efb had 4324 first. can-docs is off the ladder entirely on VitePress's 5173.)

### TypeScript stays on 6.x

TS 7 is the native port and breaks both halves of the type gate: `astro check` dies inside
`@astrojs/language-server`, and `vue-tsc` cannot resolve `typescript/lib/tsc`. Neither is our code.
Revisit when `@astrojs/check` and `vue-tsc` ship TS 7 support — not because a bot reopened the bump.

## The chrome layer

`AppShell`, `SidebarNav`, `ThemeLangControls`, `CommandPalette`, `Drawer` and `Avatar` are the
site frame. They were the last things lifted because they were the only ones with real couplings
rather than merely large ones, and the couplings are worth naming — the next shell somebody tries
to share will have the same four:

1. **`AppShell` called can-api.** Sign-out was `api("/api/v1/auth/signout")` inline. A design
   system that knows the network's auth endpoint is not a design system. It is now an `@signout`
   event; the site makes the call, which it has to anyway — clearing the cookie is can-api's job
   and only the site knows where to send the member afterwards.
2. **It imported the site's i18n module.** Now `messages` in, `src/i18n.ts` out.
3. **The brand was `<img src="/logo-full.png">`** — a path only can-web serves. Now a slot,
   defaulting to `<Logo>`, which resolves its own bundled asset.
4. **The account menu linked to `/pilots/status`**, a route on one of six sites. Now
   `profileItems`, or the `profileMenu` slot.

Everything else about them is unchanged from can-web — the layout, the breakpoints, the class
lists. Those were argued about once already; re-deciding them while moving files is how a
migration becomes a redesign nobody asked for.

**`ThemeLangControls` is the single most duplicated file on the network** — 243 lines, byte for
byte identical in all six sites. It is also the one nobody would notice drifting, because a
language menu offering three locales on one site and four on another is only visible to somebody
who opens both.

Two fixes went in on the way, both real bugs rather than tidying:

- **`SidebarNav` derived which sections start open exactly once, during setup.** A `navigation`
  array that changed afterwards — a locale switch, a rail built from a computed — never
  re-derived, so the active section silently stopped opening. It is a watcher now, and a section
  the member has explicitly toggled is left alone rather than being re-opened under them.
- **`useOverlay`'s scroll lock is reference-counted.** A sheet opened from inside a dialog used to
  restore `overflow` when _it_ closed, letting the page scroll behind the dialog still open.

### Still not here

**`AppRail`** — can-efb's railed shell, the one with no top bar. It exists in exactly one site, so
there is nothing to de-duplicate, and its collapsed state lives on `<html data-rail>` coordinated
with site-level CSS and a separate Astro script rather than inside the component. Lifting a
single-use component whose state is not even its own is premature abstraction. Revisit if a second
site wants a rail.

**Toasts.** Feedback comes in four kinds and this system covers three; there is no transient
"completion" surface yet. `AlertBox` occupies the space in the meantime.

## The brand assets

`src/assets/logo/` holds the identity: twelve files, being two orientations (`H` horizontal, `V`
vertical) × two wordmark inks (`B` black, `W` white) × three wordmarks (`C` Chinese, `CE` Chinese
over English, `E` English). **They are kept verbatim, names untouched** — they are a brand
deliverable and those names are what people say to each other about them.

Three things about them are load-bearing:

**The black/white pair differ only in the wordmark's fill.** The mark itself is the same two brand
blues in both. That is why `<Logo>` exists rather than an `<img>` at each site: the call site
should never pick, because the choice has exactly one right answer at any moment and gets it wrong
the first time somebody adds dark mode. The component reads the theme.

**The mark is inlined and the lockups are files, and the split is measured.** The mark is four
paths, ~1.4 KB — cheap enough to inline, which buys `currentColor` and a first-paint render with
no second request. A wordmark is CJK converted to outlines: 5.9 KB for Chinese, **18.7 KB** for
Chinese + English, in one path. Inlining that puts a picture of some text into every page's
JavaScript. `LogoMark` is the mark; `Logo` is the lockup.

**`adaptive/` is generated, not authored.** Six files derived from the `-B-` originals with the
wordmark's `fill` swapped to `currentColor` and the mark's two blues left alone. They exist for the
case where the whole lockup has to take an arbitrary colour — over a photograph, in single-colour
print — and they only work **inlined**: an external SVG in an `<img>` cannot inherit
`currentColor`, and a CSS `mask-image` would flatten the two-tone mark to one colour. Regenerate
them from the originals rather than editing them.

> **Open question, deliberately not resolved here.** The mark's blues are `#2C5FA1` and `#47B5FA`
> (`--color-brand-deep` / `--color-brand-sky`). The UI brand is `--color-airwaysn: #4c92c1`. These
> are genuinely different colours. Either the mark is newer artwork and the ramp is stale, or a
> logo is allowed to be richer than an interface colour — a logo appears at 32px on a known
> background, while `--color-airwaysn` carries buttons, focus rings and link text at every size on
> every surface in both themes. That is a brand decision, not a refactor. **Until it is made: UI
> uses `airwaysn`, the mark uses its own two. Do not change one to match the other in passing.**

**A question of naming.** These components dropped the `Base` prefix (`BaseButton` → `Button`).
Inside a site's own `components/ui/` the prefix disambiguated a design-system button from a page
component; imported from `can-ui` the package name already does that job.

## Commands

```bash
bun install
bun run dev            # gallery on :4327 — the interactive demo
bun run lint           # format:check + astro check + vue-tsc + bun test
bun run build          # what CI builds
bun test               # the spring solver's physics, headless
bun run format         # prettier --write .
```

**The gate is `bun run lint` followed by `bun run build`.** Both halves of the typecheck are
needed: `astro check` diagnoses `.astro` and `.ts` and _silently ignores `.vue`_ — it reports
"0 errors" for a component containing any type error at all — so `vue-tsc` runs over
`tsconfig.vue.json` as well via `scripts/typecheck-vue.mjs`.

`bun test` covers `src/motion/spring.ts` and nothing else, on purpose. It is the one file here that
can be wrong in a way nobody sees: every other bug shows up as a component that looks off, while a
subtly wrong integration shows up as motion that feels slightly cheap — and nobody files a bug for
that.

## The gallery is part of the work

`src/pages/` is not documentation, it is the prototype. An interface like this cannot be specified
on paper: you find out whether a spring feels right by grabbing it. `/motion` in particular is
where the two spring parameters are exposed on sliders next to a CSS transition doing the same
move, because the difference between them is invisible in a screenshot and obvious in three
seconds of clicking.

Keep it working. A gallery that has drifted from the components is worse than none, because it
becomes the thing people trust instead of reading the source.
