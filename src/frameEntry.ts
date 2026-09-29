/**
 * `@jianyuelab-org/can-ui/frame` — the frame's pure half, with no Vue in its
 * import graph. For middleware, endpoints and plain scripts.
 * `frameEntry.test.ts` checks the graph. The barrel exports the same names.
 */
export {
  frameLinks,
  railTabs,
  reachableSites,
  type FrameLayout,
  type FrameUser,
  type NoAccessReason,
} from "./frame";
export {
  SIGN_OUT_PATH,
  signOut,
  signOutDestination,
  type AfterSignOut,
} from "./signOut";
export {
  RAIL_STORAGE_KEY,
  currentRail,
  effectiveRail,
  initialRail,
  setRail,
  type RailSetting,
  type RailState,
} from "./rail";
