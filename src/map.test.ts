import { CITY_BOUNDS } from "./city-slab";
import { describe, expect, it } from "vitest";
import {
  createExpression,
  validateStyleMin,
} from "@maplibre/maplibre-gl-style-spec";
import {
  buildingHeight,
  createStyle,
  layerGroups,
  type Theme,
} from "./map-style";
import { landmarks, searchLandmarks, tourStops } from "./landmarks";

describe("live map styles", () => {
  for (const theme of ["day", "sunset", "night"] as Theme[])
    it(`${theme} satisfies the MapLibre style specification`, () => {
      const style = createStyle(theme, 2);
      expect(validateStyleMin(style).map((e) => e.message)).toEqual([]);
      const ids = style.layers.map((l) => l.id);
      for (const id of Object.values(layerGroups).flat())
        expect(ids).toContain(id);
    });
  it("uses metres, a missing-height fallback, and the chosen exaggeration", () => {
    const compiled = createExpression(buildingHeight(2));
    expect(compiled.result).toBe("success");
    if (compiled.result !== "success")
      throw new Error("Height expression did not compile");
    expect(
      compiled.value.evaluate(
        { zoom: 15 },
        { type: 3, properties: { render_height: 30 } },
      ),
    ).toBe(60);
    expect(
      compiled.value.evaluate({ zoom: 15 }, { type: 3, properties: {} }),
    ).toBe(18);
    expect(
      compiled.value.evaluate(
        { zoom: 15 },
        { type: 3, properties: { render_height: 0 } },
      ),
    ).toBe(6);
  });
});
describe("landmark navigation", () => {
  it("searches names, neighbourhoods and categories without case sensitivity", () => {
    expect(searchLandmarks("  KOKAPET  ").map((l) => l.id)).toEqual([
      "kokapet",
    ]);
    expect(searchLandmarks("old city").length).toBeGreaterThan(1);
    expect(
      searchLandmarks("", "Heritage & culture").every(
        (l) => l.category === "Heritage & culture",
      ),
    ).toBe(true);
    expect(searchLandmarks("not-a-landmark")).toEqual([]);
  });
  it("keeps tour stops unique and inside the navigable metropolitan bounds", () => {
    expect(tourStops).toHaveLength(10);
    expect(new Set(tourStops.map((l) => l.id)).size).toBe(10);
    for (const l of landmarks) {
      expect(l.coordinates[0]).toBeGreaterThan(78.12);
      expect(l.coordinates[0]).toBeLessThan(78.75);
      expect(l.coordinates[1]).toBeGreaterThan(17.12);
      expect(l.coordinates[1]).toBeLessThan(17.67);
    }
  });
  it("finds the newly requested places by common names and spelling variants", () => {
    const queries = {
      "Birla Mandir": "birla-mandir",
      planetarium: "birla-planetarium",
      "zoo park": "nehru-zoo",
      "Durgam Cheruvu suspension bridge": "durgam-bridge",
      "Chilkoor Balaji": "chilkur-balaji",
      "Shri Jagannath Swami": "jagannath-temple",
      "Secunderabad Gurudwara": "secunderabad-gurdwara",
      "Secunderbad clock tower": "secunderabad-clock-tower",
      "Parade Grounds": "parade-grounds",
      Gymkhana: "gymkhana-grounds",
      Chanchalgunda: "chanchalguda-jail",
    };
    for (const [query, id] of Object.entries(queries))
      expect(searchLandmarks(query).map((l) => l.id)).toContain(id);
    expect(new Set(landmarks.map((l) => l.id)).size).toBe(landmarks.length);
    for (const {
      coordinates: [lng, lat],
    } of landmarks) {
      expect(lng).toBeGreaterThan(CITY_BOUNDS[0]);
      expect(lng).toBeLessThan(CITY_BOUNDS[2]);
      expect(lat).toBeGreaterThan(CITY_BOUNDS[1]);
      expect(lat).toBeLessThan(CITY_BOUNDS[3]);
    }
  });
});
