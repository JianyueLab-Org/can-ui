import { describe, expect, test } from "bun:test";
import { placePopover, popoverOrigin } from "./popoverPosition";

const viewport = { width: 1000, height: 800 };
const OFFSET = 8;

function anchor(top: number, bottom: number, left: number, right: number) {
  return { top, bottom, left, right };
}

describe("vertical placements (unchanged behaviour)", () => {
  test("bottom-start sits under the trigger, left edges aligned", () => {
    expect(
      placePopover(
        "bottom-start",
        anchor(100, 140, 200, 240),
        { width: 300, height: 200 },
        viewport,
        OFFSET,
      ),
    ).toEqual({ top: 148, left: 200, resolved: "bottom-start" });
  });

  test("bottom flips to top when it runs off the bottom and top fits", () => {
    expect(
      placePopover(
        "bottom-start",
        anchor(700, 740, 200, 240),
        { width: 300, height: 200 },
        viewport,
        OFFSET,
      ),
    ).toEqual({ top: 492, left: 200, resolved: "top-start" });
  });

  test("bottom stays when neither side fits", () => {
    expect(
      placePopover(
        "bottom-start",
        anchor(100, 740, 200, 240),
        { width: 300, height: 700 },
        viewport,
        OFFSET,
      ).resolved,
    ).toBe("bottom-start");
  });

  test("bottom-end aligns right edges", () => {
    expect(
      placePopover(
        "bottom-end",
        anchor(100, 140, 700, 740),
        { width: 300, height: 200 },
        viewport,
        OFFSET,
      ),
    ).toEqual({ top: 148, left: 440, resolved: "bottom-end" });
  });

  test("start flips to end when it runs off the right", () => {
    expect(
      placePopover(
        "bottom-start",
        anchor(100, 140, 900, 940),
        { width: 300, height: 200 },
        viewport,
        OFFSET,
      ),
    ).toEqual({ top: 148, left: 640, resolved: "bottom-end" });
  });

  test("a panel wider than the viewport is pinned to the 8px margin", () => {
    expect(
      placePopover(
        "bottom-start",
        anchor(100, 140, 100, 140),
        { width: 1200, height: 200 },
        viewport,
        OFFSET,
      ).left,
    ).toBe(8);
  });
});

describe("right-start", () => {
  test("opens to the right of the trigger, top edges aligned", () => {
    expect(
      placePopover(
        "right-start",
        anchor(120, 160, 12, 232),
        { width: 352, height: 400 },
        viewport,
        OFFSET,
      ),
    ).toEqual({ top: 120, left: 240, resolved: "right-start" });
  });

  test("flips to the left when the right has no room and the left does", () => {
    expect(
      placePopover(
        "right-start",
        anchor(120, 160, 700, 900),
        { width: 352, height: 400 },
        viewport,
        OFFSET,
      ),
    ).toEqual({ top: 120, left: 340, resolved: "left-start" });
  });

  test("the offset is the gap to the trigger", () => {
    expect(
      placePopover(
        "right-start",
        anchor(120, 160, 12, 232),
        { width: 352, height: 400 },
        viewport,
        21,
      ),
    ).toEqual({ top: 120, left: 253, resolved: "right-start" });
  });

  test("aligns bottom edges when the panel runs off the bottom", () => {
    expect(
      placePopover(
        "right-start",
        anchor(600, 640, 12, 232),
        { width: 352, height: 400 },
        viewport,
        OFFSET,
      ),
    ).toEqual({ top: 240, left: 240, resolved: "right-end" });
  });

  test("top is clamped to the 8px margin", () => {
    expect(
      placePopover(
        "right-start",
        anchor(700, 740, 12, 232),
        { width: 352, height: 790 },
        viewport,
        OFFSET,
      ).top,
    ).toBe(8);
  });
});

describe("popoverOrigin", () => {
  test("the corner nearest the trigger", () => {
    expect(popoverOrigin("bottom-start")).toEqual({ x: "0%", y: "0%" });
    expect(popoverOrigin("top-end")).toEqual({ x: "100%", y: "100%" });
    expect(popoverOrigin("right-start")).toEqual({ x: "0%", y: "0%" });
    expect(popoverOrigin("right-end")).toEqual({ x: "0%", y: "100%" });
    expect(popoverOrigin("left-start")).toEqual({ x: "100%", y: "0%" });
    expect(popoverOrigin("left-end")).toEqual({ x: "100%", y: "100%" });
  });
});
