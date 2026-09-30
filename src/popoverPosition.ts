/**
 * Where a Popover panel goes — the pure half of `Popover.vue`'s `place()`.
 *
 * Vertical placements flip top/bottom rather than clip, and flip start/end
 * when the panel runs off the side. `right-start` opens beside the trigger
 * (the rail); it flips to the left when the right has no room, and aligns
 * bottom edges when the panel runs off the bottom.
 *
 * The result is kept inside the viewport with an 8px margin. `Math.max` runs
 * last, so a panel too large to satisfy both bounds is pinned to the margin
 * rather than pushed off-screen.
 */

export type PopoverPlacement =
  "bottom-start" | "bottom-end" | "top-start" | "top-end" | "right-start";

/** What a placement resolves to after flipping. */
export type ResolvedPlacement =
  | "bottom-start"
  | "bottom-end"
  | "top-start"
  | "top-end"
  | "right-start"
  | "right-end"
  | "left-start"
  | "left-end";

/** The trigger's box. A `DOMRect` satisfies it. */
export interface AnchorRect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface BoxSize {
  width: number;
  height: number;
}

export interface PopoverPosition {
  top: number;
  left: number;
  resolved: ResolvedPlacement;
}

/** Viewport margin around a panel, in px. */
export const POPOVER_MARGIN = 8;

function clamp(value: number, size: number, limit: number): number {
  return Math.max(
    Math.min(value, limit - size - POPOVER_MARGIN),
    POPOVER_MARGIN,
  );
}

function placeVertical(
  placement: Exclude<PopoverPlacement, "right-start">,
  anchor: AnchorRect,
  panel: BoxSize,
  viewport: BoxSize,
  offset: number,
): PopoverPosition {
  let [side, align] = placement.split("-") as [
    "bottom" | "top",
    "start" | "end",
  ];

  if (
    side === "bottom" &&
    anchor.bottom + offset + panel.height > viewport.height
  ) {
    if (anchor.top - offset - panel.height > 0) side = "top";
  } else if (side === "top" && anchor.top - offset - panel.height < 0) {
    if (anchor.bottom + offset + panel.height < viewport.height) {
      side = "bottom";
    }
  }
  if (align === "start" && anchor.left + panel.width > viewport.width) {
    align = "end";
  } else if (align === "end" && anchor.right - panel.width < 0) {
    align = "start";
  }

  const top =
    side === "bottom"
      ? anchor.bottom + offset
      : anchor.top - offset - panel.height;
  const left = align === "start" ? anchor.left : anchor.right - panel.width;

  return {
    top: Math.round(top),
    left: Math.round(clamp(left, panel.width, viewport.width)),
    resolved: `${side}-${align}`,
  };
}

function placeBeside(
  anchor: AnchorRect,
  panel: BoxSize,
  viewport: BoxSize,
  offset: number,
): PopoverPosition {
  let side: "right" | "left" = "right";
  if (
    anchor.right + offset + panel.width > viewport.width &&
    anchor.left - offset - panel.width > 0
  ) {
    side = "left";
  }
  let align: "start" | "end" = "start";
  if (
    anchor.top + panel.height > viewport.height &&
    anchor.bottom - panel.height > 0
  ) {
    align = "end";
  }

  const left =
    side === "right"
      ? anchor.right + offset
      : anchor.left - offset - panel.width;
  const top = align === "start" ? anchor.top : anchor.bottom - panel.height;

  return {
    top: Math.round(clamp(top, panel.height, viewport.height)),
    left: Math.round(clamp(left, panel.width, viewport.width)),
    resolved: `${side}-${align}`,
  };
}

export function placePopover(
  placement: PopoverPlacement,
  anchor: AnchorRect,
  panel: BoxSize,
  viewport: BoxSize,
  offset: number,
): PopoverPosition {
  return placement === "right-start"
    ? placeBeside(anchor, panel, viewport, offset)
    : placeVertical(placement, anchor, panel, viewport, offset);
}

/** `transform-origin`: the panel corner nearest the trigger. */
export function popoverOrigin(resolved: ResolvedPlacement): {
  x: "0%" | "100%";
  y: "0%" | "100%";
} {
  const [side, align] = resolved.split("-") as [string, "start" | "end"];
  if (side === "right" || side === "left") {
    return {
      x: side === "right" ? "0%" : "100%",
      y: align === "start" ? "0%" : "100%",
    };
  }
  return {
    x: align === "start" ? "0%" : "100%",
    y: side === "bottom" ? "0%" : "100%",
  };
}
