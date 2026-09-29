/**
 * Network sign-out.
 *
 * Every site serves `POST /api/v1/auth/signout` on its own origin and
 * forwards it to can-api, returning can-api's `Set-Cookie` unchanged. The
 * cookie lives on the parent domain, so one request signs the member out of
 * every site. This path is the one endpoint can-ui knows.
 *
 * After a successful request: public sites reload in place; gated sites go to
 * can-web `/`, since reloading a gated page would bounce to sign-in.
 * On failure (fetch error or ok === false): returns false and does not navigate.
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
) => Promise<{ ok: boolean }>;

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
 * Posts the sign-out request. Returns true and navigates on success (ok === true).
 * Returns false and does not navigate on failure (fetch error or ok === false).
 */
export async function signOut(options: SignOutOptions): Promise<boolean> {
  const send: SignOutFetch =
    options.fetch ??
    ((input, init) => fetch(input, init) as Promise<{ ok: boolean }>);
  const location = options.location ?? window.location;
  try {
    const response = await send(SIGN_OUT_PATH, {
      method: "POST",
      credentials: "same-origin",
    });
    if (!response.ok) {
      return false;
    }
  } catch {
    return false;
  }
  const target = signOutDestination(options.after, options.origins);
  if (target) location.assign(target);
  else location.reload();
  return true;
}
