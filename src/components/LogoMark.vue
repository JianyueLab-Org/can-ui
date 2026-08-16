<script setup lang="ts">
/**
 * The mark alone — the symbol without any wordmark.
 *
 * This one is **inlined** while the full lockups are files, and the split is
 * measured rather than stylistic: the mark is four paths and about 1.4 KB of
 * path data, while a wordmark is CJK text converted to outlines and runs from
 * 5.9 KB (Chinese) to 18.7 KB (Chinese + English) in a *single* path. Inlining
 * the mark costs almost nothing and buys the two things a file cannot give:
 * it takes its colour from CSS, and it is on screen in the first paint with no
 * second request. Inlining a wordmark would put 19 KB of outlined glyphs into
 * every page's JavaScript to render a picture of some text.
 *
 * The mark is **two-tone brand blue by default and that is not decoration** —
 * the two blues are the brand, so `tone="mono"` (everything in
 * `currentColor`) exists only for the places colour cannot survive: a
 * single-colour print, an embossed surface, a favicon at 16px where the two
 * tones muddy into one. Reach for it deliberately, not to make a header tidier.
 *
 * Size it with a `size-*` class; the viewBox is square.
 */
withDefaults(
  defineProps<{
    /** `brand` keeps the two blues; `mono` renders the whole mark in currentColor. */
    tone?: "brand" | "mono";
    /** Accessible name. Omit when a wordmark or site title already names it. */
    label?: string;
  }>(),
  { tone: "brand" },
);
</script>

<template>
  <!-- viewBox is the artwork's own 256-square, not a box cropped to the ink.
       Keeping the designer's padding means the mark sits at the same optical
       weight beside a wordmark as it does alone, and it avoids clipping a
       curve that reaches past its own control points. -->
  <svg
    viewBox="0 0 256 256"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    class="size-8"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : true"
  >
    <path
      d="M216.576 110.797C158.757 188.675 2.499 200.246 35.5381 99.3587C48.0918 166.312 119.825 157.52 171.43 134.797C178.416 131.721 184.529 128.081 190.576 125.297C209.576 111.297 210.586 116.217 216.576 110.797Z"
      :fill="tone === 'mono' ? 'currentColor' : 'var(--color-brand-deep)'"
    />
    <path
      d="M120.673 38.0316C144.5 37.2974 180.851 49.2418 201.501 86.4105C144.686 26.7905 79.2382 57.4352 72.7068 86.4105C67.6444 108.869 103.957 136.372 172.076 119.297L187.325 123.687C184.366 125.206 181.443 126.629 178.558 127.962L167.717 125.44C167.12 125.337 166.507 125.381 165.93 125.566C165.354 125.751 164.831 126.073 164.406 126.503L161.203 130.803C160.551 131.495 160.741 132.635 161.651 133.056L163.902 134.092C90.5114 161.482 45.1866 127.857 48.1043 93.4906C50.4264 66.1401 78.5996 37.3456 120.673 38.0316Z"
      :fill="tone === 'mono' ? 'currentColor' : 'var(--color-brand-sky)'"
    />
    <path
      d="M153.535 213.226C184.804 201.426 212.534 168.977 211.354 124.728C185.198 154.424 114.832 205.792 42.6179 173.697C69.7572 221.485 122.266 225.025 153.535 213.226Z"
      :fill="tone === 'mono' ? 'currentColor' : 'var(--color-brand-sky)'"
    />
    <path
      d="M173.751 114.031C174.137 113.646 174.66 113.414 175.19 113.422L200.663 114.86L208.735 109.13C210.853 107.567 215.818 105.929 217.335 106.877C218.864 107.833 217.423 109.876 216.453 110.905L187.914 137.056C185.623 138.991 182.133 139.66 179.446 138.415L165.757 132.114C165.269 131.887 165.166 131.276 165.516 130.904L167.236 128.596C167.464 128.365 167.745 128.192 168.055 128.092C168.364 127.993 168.693 127.97 169.013 128.025L181.524 130.936L192.042 122.785L172.537 116.909C172.012 116.696 171.861 116.062 172.234 115.642L173.751 114.031Z"
      :fill="tone === 'mono' ? 'currentColor' : 'var(--color-brand-deep)'"
    />
  </svg>
</template>
