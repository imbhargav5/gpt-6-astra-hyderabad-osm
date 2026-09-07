import { describe, expect, it } from "vitest";
import { containsTree, seededCell } from "./forest-geometry";

describe("forest placement", () => {
  it("keeps trees in woodland polygons and out of their holes", () => {
    const woodland = {
      type: "Polygon" as const,
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
        [
          [0.3, 0.3],
          [0.7, 0.3],
          [0.7, 0.7],
          [0.3, 0.7],
          [0.3, 0.3],
        ],
      ],
    };
    expect(containsTree(0.1, 0.1, woodland)).toBe(true);
    expect(containsTree(0.5, 0.5, woodland)).toBe(false);
    expect(containsTree(2, 0.5, woodland)).toBe(false);
  });
  it("excludes points near mapped road segments, including zero-length segments", () => {
    const road = {
      type: "LineString" as const,
      coordinates: [
        [78.4, 17.4],
        [78.4, 17.41],
        [78.4, 17.41],
      ],
    };
    expect(containsTree(78.40001, 17.405, road)).toBe(true);
    expect(containsTree(78.401, 17.405, road)).toBe(false);
  });
  it("uses repeatable variation within the unit interval", () => {
    expect(seededCell(123, 456)).toBe(seededCell(123, 456));
    expect(seededCell(123, 456)).not.toBe(seededCell(456, 123));
    for (let i = -20; i < 20; i++) {
      expect(seededCell(i, 42)).toBeGreaterThanOrEqual(0);
      expect(seededCell(i, 42)).toBeLessThan(1);
    }
  });
});
