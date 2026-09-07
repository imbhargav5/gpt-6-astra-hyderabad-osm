import { describe, expect, it } from "vitest";
import { BUDDHA_CENTER, buddhaMesh, buddhaReplacementIds } from "./buddha";
import type { Feature, Polygon } from "geojson";

describe("Buddha sculpture", () => {
  it("has finite mesh positions and unit lighting normals within a bounded geometry budget", () => {
    const mesh = buddhaMesh();
    expect(mesh.length % 21).toBe(0);
    expect(mesh.length / 21).toBeLessThan(40000);
    let top = 0;
    for (let i = 0; i < mesh.length; i += 7) {
      expect([...mesh.slice(i, i + 7)].every(Number.isFinite)).toBe(true);
      expect(Math.hypot(mesh[i + 3], mesh[i + 4], mesh[i + 5])).toBeCloseTo(
        1,
        4,
      );
      expect(mesh[i + 2]).toBeGreaterThanOrEqual(0);
      expect(Math.abs(mesh[i])).toBeLessThanOrEqual(4.5);
      expect(Math.abs(mesh[i + 1])).toBeLessThanOrEqual(4.5);
      top = Math.max(top, mesh[i + 2]);
    }
    expect(top).toBeGreaterThan(20);
    expect(top).toBeLessThan(21);
  });
  it("replaces the small statue footprint without hiding the island or nearby buildings", () => {
    const square = (size: number, id: number): Feature<Polygon> => {
      const [x, y] = BUDDHA_CENTER;
      return {
        type: "Feature",
        id,
        properties: {},
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [x - size, y - size],
              [x + size, y - size],
              [x + size, y + size],
              [x - size, y + size],
              [x - size, y - size],
            ],
          ],
        },
      };
    };
    expect(
      buddhaReplacementIds([square(0.00003, 1), square(0.0003, 2)]),
    ).toEqual([1]);
  });
});
