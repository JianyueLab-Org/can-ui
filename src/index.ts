/**
 * can-ui — the Cerulean Aviation Network design system.
 *
 *   import { Button, Card, Sheet } from "can-ui";
 *   import "can-ui/styles";
 *
 * The stylesheet is not optional and is not imported by this module: it is a
 * side effect, and importing it from here would pull the whole system into a
 * bundle that only wanted one component. Import it once, in the site's layout.
 *
 * A deep import is available for the rare case where one component is wanted
 * without the barrel — `can-ui/components/Button.vue`.
 */
import AppShellComponent from "./components/AppShell.vue";
import SiteHeaderComponent from "./components/SiteHeader.vue";

/* Brand */
export { default as Logo } from "./components/Logo.vue";
export { default as LogoMark } from "./components/LogoMark.vue";

/* Primitives */
export { default as Icon } from "./components/Icon.vue";
export { default as Avatar } from "./components/Avatar.vue";
export { default as Spinner } from "./components/Spinner.vue";
export { default as Skeleton } from "./components/Skeleton.vue";
export { default as Button } from "./components/Button.vue";
export { default as Badge } from "./components/Badge.vue";
export { default as Card } from "./components/Card.vue";

/* Forms */
export { default as Input } from "./components/Input.vue";
export { default as Textarea } from "./components/Textarea.vue";
export { default as Select } from "./components/Select.vue";
export { default as Toggle } from "./components/Toggle.vue";
export { default as Segmented } from "./components/Segmented.vue";

/* Page furniture */
export { default as AlertBox } from "./components/AlertBox.vue";
export { default as EmptyState } from "./components/EmptyState.vue";
export { default as PageHeader } from "./components/PageHeader.vue";
export { default as StatCard } from "./components/StatCard.vue";
export { default as DataTable } from "./components/DataTable.vue";
export { default as ListGroup } from "./components/ListGroup.vue";
export { default as ListRow } from "./components/ListRow.vue";

/* Surfaces */
export { default as Toolbar } from "./components/Toolbar.vue";
export { default as Dialog } from "./components/Dialog.vue";
export { default as Sheet } from "./components/Sheet.vue";
export { default as Drawer } from "./components/Drawer.vue";
export { default as Popover } from "./components/Popover.vue";

/* Chrome — the site frame. It calls one endpoint, the site's own
   /api/v1/auth/signout, and imports no site module. See AGENTS.md. */
export { default as CanFrame } from "./components/CanFrame.vue";
export { default as AccountMenu } from "./components/AccountMenu.vue";
export { default as NoAccess } from "./components/NoAccess.vue";
export { default as SidebarNav } from "./components/SidebarNav.vue";
export { default as CommandPalette } from "./components/CommandPalette.vue";
export { default as ThemeLangControls } from "./components/ThemeLangControls.vue";
export { default as ThemeToggle } from "./components/ThemeToggle.vue";
export { default as NetworkMenu } from "./components/NetworkMenu.vue";
export { default as SiteFooter } from "./components/SiteFooter.vue";

/** @deprecated Use `CanFrame` with `layout="tool"`. Removed in 27.2.0. */
export const AppShell = AppShellComponent;

/**
 * @deprecated Use `CanFrame` with `layout="content"` or `layout="map"`.
 * Removed in 27.2.0.
 */
export const SiteHeader = SiteHeaderComponent;

/* Removed with SiteHeader in 27.2.0. */
export {
  headerNetworkSites,
  type SiteHeaderLabels,
  type HeaderNetworkOptions,
} from "./siteHeader";

/* Frame helpers */
export {
  frameLinks,
  noAccessText,
  railTabs,
  reachableSites,
  type FrameLayout,
  type FrameLink,
  type FrameUser,
  type NoAccessReason,
  type ReachableOptions,
} from "./frame";

/* ⌘K */
export {
  commandTier,
  filterCommands,
  framePaletteItems,
  navCommandItems,
  networkPageItems,
  pageKeywords,
  pageTitle,
  pageVisible,
  type CommandItem,
  type FramePaletteOptions,
  type NavCommandInput,
  type PaletteOptions,
} from "./palette";

/* Sign-out */
export {
  SIGN_OUT_PATH,
  signOut,
  signOutDestination,
  type AfterSignOut,
  type SignOutFetch,
  type SignOutLocation,
  type SignOutOptions,
} from "./signOut";

/* Rail state */
export {
  RAIL_STORAGE_KEY,
  currentRail,
  effectiveRail,
  initialRail,
  setRail,
  type RailSetting,
  type RailState,
} from "./rail";

/* Navigation data shapes, and the two functions every frame shares */
export {
  buildWorkspaces,
  isCurrentPath,
  navLeaves,
  workspaceVisible,
  type NavItem,
  type NavLeaf,
  type NavChild,
  type NavSecondary,
  type Workspace,
  type WorkspaceKey,
  type WorkspaceOptions,
} from "./nav";

/* The network's map of itself. Unlike everything else here this carries
   strings — see the header of sites.ts for why that exception is deliberate. */
export {
  NETWORK_SITES,
  SITE_BY_KEY,
  SITE_LABELS,
  COMMUNITY_LINKS,
  WORKSPACE_SITE_KEYS,
  RATING_INSTRUCTOR,
  RATING_SUP,
  RATING_ADMIN,
  siteUrl,
  siteLabel,
  siteLabels,
  sectionHeadings,
  communityLinks,
  visibleSites,
  sitesBySection,
  originEnvName,
  originsFromEnv,
  type SiteKey,
  type SiteSection,
  type NetworkSite,
  type NetworkPage,
  type SiteLabel,
  type ResolvedSite,
  type SiteListOptions,
  type SiteOrigins,
  type OriginEnv,
  type SectionHeadings,
  type CommunityLink,
} from "./sites";
export { SITE_PAGES } from "./sitePages";

/* i18n */
export {
  createTranslator,
  createSiteI18n,
  resolveLocale,
  cookieDomainFor,
  CHROME_MESSAGES,
  LANGUAGES,
  LOCALES,
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  type Translator,
  type LanguageOption,
  type Locale,
  type SiteI18n,
  type CookieReader,
} from "./i18n";

/* Theme — three modes: light, dark, system (the default). */
export {
  useTheme,
  useIsDark,
  useThemeMode,
  setThemeMode,
  cycleTheme,
  resolveMode,
  applyTheme,
  storeTheme,
  toggleTheme,
  THEME_MODES,
  THEME_ICONS,
  type ThemeMode,
} from "./composables/useTheme";

/* Motion */
export {
  Spring,
  Spring2D,
  SPRINGS,
  prefersReducedMotion,
  project,
  projectToDetent,
  rubberband,
  rubberbandClamp,
  nearest,
  shouldCommit,
  VelocityTracker,
  useSpring,
  useDrag,
  type SpringConfig,
  type SpringName,
  type SpringOptions,
  type UseSpringOptions,
  type UseSpringReturn,
  type DragState,
  type UseDragOptions,
} from "./motion";

/* Composables */
export {
  useOverlay,
  usePress,
  useMediaQuery,
  useReducedMotion,
  useReducedTransparency,
  useHighContrast,
  useCoarsePointer,
  type UseOverlayOptions,
  type UsePressOptions,
} from "./composables";
export { haptics } from "./composables/haptics";

/* Icons */
export { ICON_PATHS, ICON_NAMES, type IconName } from "./icons";
