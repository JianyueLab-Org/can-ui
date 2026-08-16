/**
 * The translation contract between can-ui and a site.
 *
 * This is the piece that had to exist before the chrome components could be
 * lifted out of can-web. A shell renders about a dozen strings of its own —
 * "skip to content", "sign out", "no results" — and none of them can be
 * hardcoded in a network whose product language is Chinese and which ships
 * four locales.
 *
 * The design is deliberately the smallest thing that works, and it is the
 * shape can-web already had: **the site owns the dictionaries; can-ui only
 * knows how to read one.** A component takes a `messages` object and looks
 * keys up in it. can-ui never imports a locale file, never decides which
 * locale is active, and never touches the cookie that stores it — all three
 * are the site's, because the site is what does the server-side render that
 * has to agree with them.
 *
 * `createTranslator` is byte-for-byte compatible with can-web's
 * `src/lib/i18n.ts`, so a site passes exactly the dictionary it already
 * passes today.
 */

export type Translator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

function lookup(obj: unknown, path: string): unknown {
  return path
    .split(".")
    .reduce<unknown>(
      (acc, part) =>
        acc && typeof acc === "object"
          ? (acc as Record<string, unknown>)[part]
          : undefined,
      obj,
    );
}

function interpolate(
  template: string,
  values?: Record<string, string | number>,
): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    values[key] !== undefined ? String(values[key]) : `{${key}}`,
  );
}

/**
 * Dot-path lookup with `{name}` interpolation, falling back to `fallback` and
 * then to the key itself.
 *
 * Returning the key rather than throwing is the right failure here: a missing
 * string renders as `search.noResults` on the page, which is ugly and
 * immediately obvious to whoever is looking at it, where an exception would
 * take the whole island down and a blank would be invisible.
 */
export function createTranslator(
  dict: Record<string, unknown>,
  fallback?: Record<string, unknown>,
): Translator {
  return (key, values) => {
    const value =
      lookup(dict, key) ?? (fallback ? lookup(fallback, key) : undefined);
    return typeof value === "string" ? interpolate(value, values) : key;
  };
}

/**
 * Every string can-ui's chrome renders, with English defaults.
 *
 * The defaults are not a translation — they are a **safety net**. A site that
 * forgets a key gets a readable English word rather than `openSidebar` in the
 * middle of its header, which matters because these are the strings nobody
 * looks at: the skip link, the sidebar's `aria-label`, the palette's empty
 * state. A missing one can sit in production for months.
 *
 * Sites should override all of them. The keys are namespaced to match the
 * layout can-web's dictionaries already use, so the existing `getMessages()`
 * call passes them through unchanged.
 */
export const CHROME_MESSAGES: Record<string, unknown> = {
  skipToContent: "Skip to content",
  signOut: "Sign out",
  openSidebar: "Open sidebar",
  closeSidebar: "Close sidebar",
  close: "Close",
  openUserMenu: "Open user menu",
  workspace: {
    label: "Workspace",
  },
  search: {
    label: "Quick navigation",
    placeholder: "Jump to…",
    noResults: "Nothing matches that.",
  },
  theme: {
    toDark: "Switch to dark mode",
    toLight: "Switch to light mode",
  },
  language: {
    label: "Select language",
  },
};

/** The four locales the network ships. Sites may pass their own list. */
export interface LanguageOption {
  /** Cookie value, e.g. `zh-cn`. */
  code: string;
  /** Endonym — the language's name in itself, never translated. */
  name: string;
  /** One or two characters for the collapsed trigger. */
  short: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "zh-cn", name: "简体中文", short: "简" },
  { code: "zh-tw", name: "繁體中文", short: "繁" },
  { code: "en-us", name: "English", short: "EN" },
  { code: "ja-jp", name: "日本語", short: "日" },
];
