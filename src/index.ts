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

/* Chrome — the site frame. These take data and emit events; they call no API
   and import no site module. See AGENTS.md for what had to be untangled. */
export { default as AppShell } from "./components/AppShell.vue";
export { default as SidebarNav } from "./components/SidebarNav.vue";
export { default as CommandPalette } from "./components/CommandPalette.vue";
export type { CommandItem } from "./components/CommandPalette.vue";
export { default as ThemeLangControls } from "./components/ThemeLangControls.vue";
export { default as ThemeToggle } from "./components/ThemeToggle.vue";

/* Navigation data shapes */
export type { NavItem, NavChild, NavSecondary, Workspace } from "./nav";

/* i18n */
export {
  createTranslator,
  CHROME_MESSAGES,
  LANGUAGES,
  type Translator,
  type LanguageOption,
} from "./i18n";

/* Theme */
export {
  useIsDark,
  applyTheme,
  storeTheme,
  toggleTheme,
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
