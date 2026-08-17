import { expect, test } from "bun:test";
import { cookieDomainFor } from "./i18n";

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
