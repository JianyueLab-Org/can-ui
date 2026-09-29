import { describe, expect, test } from "bun:test";
import { SIGN_OUT_PATH, signOut, signOutDestination } from "./signOut";

describe("signOutDestination", () => {
  test("public sites reload in place", () => {
    expect(signOutDestination("reload")).toBeNull();
  });

  test("gated sites go to the main site's front page", () => {
    expect(signOutDestination("web")).toBe("https://ceruleanavi.net/");
    expect(signOutDestination("web", { web: "http://localhost:4321" })).toBe(
      "http://localhost:4321/",
    );
  });
});

describe("signOut", () => {
  test("posts to the same-origin path, then reloads when ok", async () => {
    const calls: Array<[string, RequestInit]> = [];
    let reloads = 0;
    const result = await signOut({
      after: "reload",
      fetch: async (input, init) => {
        calls.push([input, init]);
        return { ok: true };
      },
      location: {
        assign: () => {
          throw new Error("assign must not be called");
        },
        reload: () => {
          reloads += 1;
        },
      },
    });
    expect(SIGN_OUT_PATH).toBe("/api/v1/auth/signout");
    expect(calls).toEqual([
      [SIGN_OUT_PATH, { method: "POST", credentials: "same-origin" }],
    ]);
    expect(reloads).toBe(1);
    expect(result).toBe(true);
  });

  test("returns false and does not navigate when the request fails", async () => {
    let navigated = false;
    const result = await signOut({
      after: "web",
      fetch: async () => {
        throw new Error("offline");
      },
      location: {
        assign: () => {
          navigated = true;
        },
        reload: () => {
          navigated = true;
        },
      },
    });
    expect(result).toBe(false);
    expect(navigated).toBe(false);
  });

  test("returns false and does not navigate when ok is false", async () => {
    let navigated = false;
    const result = await signOut({
      after: "web",
      fetch: async () => {
        return { ok: false };
      },
      location: {
        assign: () => {
          navigated = true;
        },
        reload: () => {
          navigated = true;
        },
      },
    });
    expect(result).toBe(false);
    expect(navigated).toBe(false);
  });

  test("navigates to web destination and returns true when ok", async () => {
    let target = "";
    const result = await signOut({
      after: "web",
      fetch: async () => {
        return { ok: true };
      },
      location: {
        assign: (url) => {
          target = url;
        },
        reload: () => {},
      },
    });
    expect(target).toBe("https://ceruleanavi.net/");
    expect(result).toBe(true);
  });
});
