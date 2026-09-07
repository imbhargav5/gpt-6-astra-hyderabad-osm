import { describe, expect, it } from "vitest";
import {
  categoryShortcut,
  wrapCategory,
  nextPlaceIndex,
} from "./category-navigation";
import { placeCategories } from "./place-categories";
import { landmarks, searchLandmarks, tourStops } from "./landmarks";

describe("category navigation", () => {
  it("covers every place exactly once in ten nonempty categories", () => {
    expect(placeCategories).toHaveLength(10);
    const groups = placeCategories.map((category) =>
      searchLandmarks("", category),
    );
    expect(groups.every((group) => group.length > 0)).toBe(true);
    expect(
      groups
        .flat()
        .map((place) => place.id)
        .sort(),
    ).toEqual(landmarks.map((place) => place.id).sort());
  });
  it("tours categories in tab order with the first place auto-selected", () => {
    expect(tourStops.map((place) => place.category)).toEqual([
      ...placeCategories,
    ]);
    placeCategories.forEach((category, index) => {
      expect(tourStops[index]).toBe(searchLandmarks("", category)[0]);
    });
  });
  it("wraps in both directions without a boundary pause", () => {
    expect(categoryShortcut("ArrowRight", 9)).toBe(0);
    expect(categoryShortcut("ArrowLeft", 0)).toBe(9);
    let active = 0;
    for (let i = 0; i < 31; i++)
      active = categoryShortcut("ArrowRight", active)!;
    expect(active).toBe(1);
    expect(wrapCategory(-21)).toBe(9);
  });
  it("keeps digit shortcuts stable regardless of the cyclic order", () => {
    for (let i = 0; i < 10; i++)
      expect(categoryShortcut(String((i + 1) % 10), 7)).toBe(i);
    expect(categoryShortcut("5", 0)).toBe(4);
    expect(categoryShortcut("0", 0)).toBe(9);
    expect(categoryShortcut("ArrowUp", 3)).toBeNull();
    expect(categoryShortcut("a", 3)).toBeNull();
  });
});

describe("place keyboard navigation", () => {
  it("starts at the first or last visible result and wraps", () => {
    expect(nextPlaceIndex(-1, 3, 1)).toBe(0);
    expect(nextPlaceIndex(-1, 3, -1)).toBe(2);
    expect(nextPlaceIndex(2, 3, 1)).toBe(0);
    expect(nextPlaceIndex(0, 3, -1)).toBe(2);
    expect(nextPlaceIndex(0, 1, 1)).toBe(0);
    expect(nextPlaceIndex(-1, 0, 1)).toBeNull();
  });
});
