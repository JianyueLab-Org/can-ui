/**
 * Ambient declarations for Vite's asset-import queries.
 *
 * `astro check` gets these from `astro/client`, but `vue-tsc` runs against
 * `tsconfig.vue.json` and never sees Astro's ambient types — so without this
 * file every `import … from "…svg?url"` inside a `.vue` component fails the
 * type gate while passing the Astro one. That split is the whole reason both
 * halves of the typecheck run (see scripts/typecheck-vue.mjs).
 *
 * `?url` and `?raw` are declared rather than a bare `*.svg`, deliberately:
 * a bare `.svg` import resolves to Astro's `ImageMetadata` object, not a
 * string, and declaring it as a string here would paper over a real mistake at
 * the call site.
 */

declare module "*.svg?url" {
  const src: string;
  export default src;
}

declare module "*.svg?raw" {
  const source: string;
  export default source;
}

declare module "*.png?url" {
  const src: string;
  export default src;
}
