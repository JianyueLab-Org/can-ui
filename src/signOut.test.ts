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
  test("posts to the same-origin path, then reloads", async () => {
    const calls: Array<[string, RequestInit]> = [];
    let reloads = 0;
    await signOut({
      after: "reload",
      fetch: async (input, init) => {
        calls.push([input, init]);
        return {};
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
  });

  test("a gated site leaves even when the request fails", async () => {
    let target = "";
    await signOut({
      after: "web",
      fetch: async () => {
        throw new Error("offline");
      },
      location: {
        assign: (url) => {
          target = url;
        },
        reload: () => {},
      },
    });
    expect(target).toBe("https://ceruleanavi.net/");
  });
});
