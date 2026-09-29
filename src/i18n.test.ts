import { describe, expect, test } from "bun:test";
import { cookieDomainFor, createSiteI18n, resolveLocale } from "./i18n";

/**
 * The cookie's domain is what makes a language choice follow a member across
 * the network, and it fails *silently*: get it wrong and every site still
 * reads the same cookie name, still renders, and simply never sees the other
 * sites' choice. Nothing throws, so this is the check.
 */
test("subdomains and the apex resolve to the same parent", () => {
  const hosts = [
    "ceruleanavi.net",
    "radar.ceruleanavi.net",
    "platform.ceruleanavi.net",
    "exam.ceruleanavi.net",
    "efb.ceruleanavi.net",
    "controller.ceruleanavi.net",
    "docs.ceruleanavi.net",
  ];
  for (const h of hosts) {
    expect(cookieDomainFor(h)).toBe(".ceruleanavi.net");
  }
});

test("the leading dot is present, so the cookie covers subdomains", () => {
  expect(cookieDomainFor("radar.ceruleanavi.net").startsWith(".")).toBe(true);
});

/**
 * A domain-scoped cookie for a single-label host or a bare IP is rejected by
 * the browser outright. Answering "" keeps it host-only there, which is the
 * difference between "the preference does not follow you on a dev box" and
 * "the preference is silently discarded on a dev box".
 */
test("hosts that cannot take a domain get none", () => {
  expect(cookieDomainFor("localhost")).toBe("");
  expect(cookieDomainFor("127.0.0.1")).toBe("");
  expect(cookieDomainFor("::1")).toBe("");
  expect(cookieDomainFor("")).toBe("");
});

test("a deeper host still lands on the registrable domain", () => {
  expect(cookieDomainFor("a.b.ceruleanavi.net")).toBe(".ceruleanavi.net");
});

describe("createSiteI18n", () => {
  const dicts = {
    "zh-cn": {
      frame: { title: "标题", only: "仅简体", greet: "你好，{name}" },
      top: "顶层",
    },
    "zh-tw": { frame: { title: "標題" } },
    "en-us": { frame: { title: "Title", greet: "Hello, {name}" } },
    "ja-jp": {},
  };
  const i18n = createSiteI18n(dicts);

  test("the four locales, zh-cn first and default", () => {
    expect(i18n.LOCALES).toEqual(["zh-cn", "zh-tw", "en-us", "ja-jp"]);
    expect(i18n.DEFAULT_LOCALE).toBe("zh-cn");
  });

  test("resolveLocale accepts the four codes and nothing else", () => {
    expect(resolveLocale("ja-jp")).toBe("ja-jp");
    expect(resolveLocale("de-de")).toBe("zh-cn");
    expect(resolveLocale("")).toBe("zh-cn");
    expect(resolveLocale(undefined)).toBe("zh-cn");
    expect(resolveLocale(null)).toBe("zh-cn");
  });

  test("getLocale reads NEXT_LOCALE", () => {
    const cookies = {
      get: (name: string) =>
        name === "NEXT_LOCALE" ? { value: "en-us" } : undefined,
    };
    expect(i18n.getLocale(cookies)).toBe("en-us");
    expect(i18n.getLocale({ get: () => undefined })).toBe("zh-cn");
  });

  test("a missing key falls back to zh-cn", () => {
    const t = i18n.useTranslations("en-us", "frame");
    expect(t("title")).toBe("Title");
    expect(t("only")).toBe("仅简体");
    expect(t("greet", { name: "Li" })).toBe("Hello, Li");
  });

  test("an empty dictionary reads zh-cn throughout", () => {
    const t = i18n.useTranslations("ja-jp");
    expect(t("frame.title")).toBe("标题");
    expect(t("top")).toBe("顶层");
  });

  test("a key missing everywhere comes back as the key", () => {
    expect(i18n.useTranslations("zh-tw", "frame")("nope")).toBe("nope");
  });

  test("getMessages merges zh-cn under the requested locale", () => {
    expect(i18n.getMessages("zh-tw", "frame")).toEqual({
      title: "標題",
      only: "仅简体",
      greet: "你好，{name}",
    });
  });

  test("getMessages for zh-cn, and for an absent namespace", () => {
    expect(i18n.getMessages("zh-cn", "frame")).toEqual(dicts["zh-cn"].frame);
    expect(i18n.getMessages("en-us", "missing")).toEqual({});
  });
});
