import { describe, expect, it } from "vitest";
import { makeRoute, sampleRoute } from "./traffic";

describe("traffic routes", () => {
  it("follows road bends at constant distance instead of cutting across blocks", () => {
    const route = makeRoute([
      [78, 17],
      [78, 17.001],
      [78.001, 17.001],
    ]);
    const first = sampleRoute(route, route.distances[1] / 2);
    expect(first.coordinates[0]).toBe(78);
    expect(first.coordinates[1]).toBeCloseTo(17.0005, 6);
    expect(first.bearing).toBe(0);
    const second = sampleRoute(route, (route.distances[1] + route.length) / 2);
    expect(second.coordinates[0]).toBeCloseTo(78.0005, 6);
    expect(second.coordinates[1]).toBe(17.001);
    expect(second.bearing).toBe(90);
  });
  it("handles repeated vertices and clamps the endpoints", () => {
    const route = makeRoute([
      [78, 17],
      [78, 17],
      [78, 17.001],
    ]);
    expect(sampleRoute(route, -100).coordinates).toEqual([78, 17]);
    expect(sampleRoute(route, route.length + 100).coordinates).toEqual([
      78, 17.001,
    ]);
    expect(Number.isFinite(sampleRoute(route, 0).bearing)).toBe(true);
  });
});
