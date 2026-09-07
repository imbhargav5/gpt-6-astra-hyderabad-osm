import { describe, expect, it } from "vitest";
import { CITY_BOUNDS, clipToViewport, type ClipPoint } from "./city-slab";
import { landmarks } from "./landmarks";

describe("bounded city presentation", () => {
  it("includes every curated place in the display crop", () => {
    for (const place of landmarks) {
      const [x, y] = place.coordinates;
      expect(x).toBeGreaterThan(CITY_BOUNDS[0]);
      expect(x).toBeLessThan(CITY_BOUNDS[2]);
      expect(y).toBeGreaterThan(CITY_BOUNDS[1]);
      expect(y).toBeLessThan(CITY_BOUNDS[3]);
    }
  });
  it("keeps the entire viewport visible when zoomed inside the crop", () => {
    const points: ClipPoint[] = [
      [-10, -10, 0, 1],
      [10, -10, 0, 1],
      [10, 10, 0, 1],
      [-10, 10, 0, 1],
    ];
    const clipped = clipToViewport(points);
    expect(clipped).toHaveLength(4);
    expect(
      clipped.every((p) => Math.abs(p[0]) === 1 && Math.abs(p[1]) === 1),
    ).toBe(true);
  });
  it("handles edges behind the near plane without inverted or infinite screen coordinates", () => {
    const clipped = clipToViewport([
      [-0.5, -0.5, 0, 1],
      [0.5, -0.5, 0, 1],
      [0.5, 0.5, -2, -1],
      [-0.5, 0.5, -2, -1],
    ]);
    expect(clipped.length).toBeGreaterThan(0);
    for (const p of clipped) {
      expect(p[3]).toBeGreaterThan(0);
      expect(p.every(Number.isFinite)).toBe(true);
      expect(Math.abs(p[0] / p[3])).toBeLessThanOrEqual(1.00001);
    }
    expect(
      clipToViewport([
        [-1, -1, 0, -1],
        [1, -1, 0, -1],
        [1, 1, 0, -1],
      ]),
    ).toEqual([]);
  });
});
