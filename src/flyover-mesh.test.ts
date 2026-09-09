import { describe, it, expect } from "vitest";
import { createFlyoverMesh, meshOrigin } from "./flyover-mesh";
import type { FeatureCollection, Polygon } from "geojson";
const [x, y] = meshOrigin;
const deck: FeatureCollection<Polygon> = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { base: 6, top: 7, part: "deck" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [x, y],
            [x + 0.0001, y],
            [x + 0.0001, y + 0.0001],
            [x, y + 0.0001],
            [x, y],
          ],
        ],
      },
    },
  ],
};
describe("terrain-aware flyover mesh", () => {
  it("builds a closed deck including its underside", () => {
    const mesh = createFlyoverMesh(deck, 2, () => 100, meshOrigin);
    expect(mesh.length / 9).toBe(36);
    const normals = [];
    for (let i = 0; i < mesh.length; i += 9) normals.push(mesh[i + 5]);
    expect(normals.some((n) => n > 0.99)).toBe(true);
    expect(normals.some((n) => n < -0.99)).toBe(true);
  });
  it("keeps a legacy deck planar instead of twisting each corner with terrain", () => {
    const mesh = createFlyoverMesh(
      deck,
      2,
      (p) => 100 + (p[0] - x) * 100000,
      meshOrigin,
    );
    const z = [];
    for (let i = 0; i < mesh.length; i += 9) z.push(mesh[i + 2]);
    expect(Math.min(...z)).toBeCloseTo(111);
    expect(Math.max(...z)).toBeCloseTo(112);
    expect(mesh.every(Number.isFinite)).toBe(true);
  });
  it("waits for terrain and culls geometry outside the nearby view", () => {
    expect(createFlyoverMesh(deck, 2, () => null, meshOrigin)).toHaveLength(0);
    expect(createFlyoverMesh(deck, 2, () => 100, [79, 18])).toHaveLength(0);
  });
  it("retains clearance at the lowest visual height setting", () => {
    const mesh = createFlyoverMesh(deck, 0.1, () => 0, meshOrigin);
    const z = [];
    for (let i = 0; i < mesh.length; i += 9) z.push(mesh[i + 2]);
    expect(Math.min(...z)).toBe(6);
  });
});
