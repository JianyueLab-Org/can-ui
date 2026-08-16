// @ts-check
import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import tailwindcss from "@tailwindcss/vite";

// This repo is a *library* first and a site second. The site is the gallery
// under src/pages — the interactive demo that lets us play with a component
// before shipping it, which is worth more than any static spec of it. It is
// static output on purpose: nothing here talks to can-api, so there is no
// reason to run a Node server for it.
export default defineConfig({
  output: "static",
  integrations: [vue()],
  vite: {
    plugins: [tailwindcss()],
  },
});
