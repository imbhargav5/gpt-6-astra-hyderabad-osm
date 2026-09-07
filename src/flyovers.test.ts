import { describe, it, expect } from "vitest";
import { buildFlyovers, elevatedRoads, type ElevatedRoad } from "./flyovers";
const road: ElevatedRoad = {
  id: 1,
  name: "Test flyover",
  highway: "primary",
  layer: 1,
  lanes: 2,
  width: 8,
  coordinates: [
    [78.4, 17.4],
    [78.401, 17.4],
    [78.402, 17.401],
  ],
};
describe("elevated roads", () => {
  it("keeps a clear space below the deck and supports it with piers", () => {
    const f = buildFlyovers([road]).features;
    expect(
      f.some((f) => f.properties!.part === "pier" && f.properties!.base === 0),
    ).toBe(true);
    expect(
      f
        .filter((f) => f.properties!.part === "deck")
        .every((f) => f.properties!.base > 0),
    ).toBe(true);
    expect(new Set(f.map((f) => f.properties!.part))).toEqual(
      new Set(["deck", "surface", "barrier", "pier", "marking"]),
    );
    for (const x of f) {
      expect(x.geometry.coordinates[0][0]).toEqual(
        x.geometry.coordinates[0].at(-1),
      );
      expect(x.properties!.top).toBeGreaterThan(x.properties!.base);
    }
  });
  it("separates stacked crossings and tolerates duplicate nodes", () => {
    const low = buildFlyovers([road]).features.find(
      (f) => f.properties!.part === "deck",
    )!;
    const high = buildFlyovers([
      {
        ...road,
        layer: 2,
        coordinates: [road.coordinates[0], ...road.coordinates],
      },
    ]).features.find((f) => f.properties!.part === "deck")!;
    expect(high.properties!.base).toBeGreaterThan(low.properties!.top);
  });
  it("includes the PV Narasimha Rao expressway and multiple named flyovers", () => {
    expect(elevatedRoads.some((r) => /narasimha/i.test(r.name))).toBe(true);
    expect(
      new Set(elevatedRoads.filter((r) => r.name).map((r) => r.name)).size,
    ).toBeGreaterThan(5);
  });
  it("does not duplicate the bespoke Durgam Cheruvu bridge", () => {
    expect(
      buildFlyovers([
        {
          ...road,
          coordinates: [
            [78.389, 17.4316],
            [78.391, 17.432],
          ],
        },
      ]).features,
    ).toHaveLength(0);
  });
});
