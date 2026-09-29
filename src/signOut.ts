/**
 * Network sign-out.
 *
 * Every site serves `POST /api/v1/auth/signout` on its own origin and
 * forwards it to can-api, returning can-api's `Set-Cookie` unchanged. The
 * cookie lives on the parent domain, so one request signs the member out of
 * every site. This path is the one endpoint can-ui knows.
 *
 * After the request: public sites reload in place; gated sites go to can-web
 * `/`, since reloading a gated page would bounce to sign-in.
 */
import { siteUrl, type SiteOrigins } from "./sites";

export const SIGN_OUT_PATH = "/api/v1/auth/signout";

/** `reload` for public sites, `web` for gated ones. */
export type AfterSignOut = "reload" | "web";

/** Where to go after sign-out; null means reload in place. */
export function signOutDestination(
  after: AfterSignOut,
  origins?: SiteOrigins,
): string | null {
  return after === "web" ? siteUrl("web", "/", origins) : null;
}

export type SignOutFetch = (
  input: string,
  init: RequestInit,
) => Promise<unknown>;

export interface SignOutLocation {
  assign(url: string): void;
  reload(): void;
}

export interface SignOutOptions {
  after: AfterSignOut;
  origins?: SiteOrigins;
  /** Injected in tests. Defaults to the global `fetch`. */
  fetch?: SignOutFetch;
  /** Injected in tests. Defaults to `window.location`. */
  location?: SignOutLocation;
}

/**
 * Posts the sign-out, then reloads or navigates. A failed request still
 * navigates: the next page shows the real session state.
 */
export async function signOut(options: SignOutOptions): Promise<void> {
  const send: SignOutFetch =
    options.fetch ?? ((input, init) => fetch(input, init));
  const location = options.location ?? window.location;
  try {
    await send(SIGN_OUT_PATH, { method: "POST", credentials: "same-origin" });
  } catch {
    // Navigate anyway; see above.
  }
  const target = signOutDestination(options.after, options.origins);
  if (target) location.assign(target);
  else location.reload();
}
