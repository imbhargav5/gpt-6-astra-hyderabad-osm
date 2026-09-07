import { describe, it, expect } from "vitest";
import { PLACE_MODELS, placeReplacementIds } from "./place-models";
import { createSiteDetails, insideSite } from "./place-surfaces";
import footprints from "./data/landmark-footprints.json";
import type { Feature, Polygon } from "geojson";

describe("new landmark detailing", () => {
  it("covers all eleven places with individual models or mapped campus geometry", () => {
    const coverage = new Set([
      ...PLACE_MODELS.map((m) => m.id),
      ...createSiteDetails()
        .features.filter((f) =>
          ["zoo", "parade", "gymkhana", "jail"].includes(f.properties!.site),
        )
        .map(
          (f) =>
            ({
              parade: "parade-grounds",
              gymkhana: "gymkhana-grounds",
              jail: "chanchalguda-jail",
              zoo: "nehru-zoo",
            })[f.properties!.site as "parade"],
        ),
    ]);
    expect(coverage.size).toBe(11);
  });
  it("has finite mesh data, normalized normals and bounded geometry budgets", () => {
    for (const model of PLACE_MODELS) {
      expect(model.mesh.length % 27).toBe(0);
      expect(model.mesh.length / 27).toBeGreaterThan(300);
      expect(model.mesh.length / 27).toBeLessThan(50000);
      expect(model.mesh.every(Number.isFinite)).toBe(true);
      let maxNormalError = 0;
      for (let i = 0; i < model.mesh.length; i += 9)
        maxNormalError = Math.max(
          maxNormalError,
          Math.abs(
            Math.hypot(
              model.mesh[i + 3],
              model.mesh[i + 4],
              model.mesh[i + 5],
            ) - 1,
          ),
        );
      expect(maxNormalError).toBeLessThan(0.0001);
    }
  });
  it("only replaces fully contained native footprints", () => {
    const [x, y] = PLACE_MODELS[0].center;
    const f = (id: number, r: number): Feature<Polygon> => ({
      type: "Feature",
      id,
      properties: {},
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [x - r, y - r],
            [x + r, y - r],
            [x + r, y + r],
            [x - r, y + r],
            [x - r, y - r],
          ],
        ],
      },
    });
    expect(
      placeReplacementIds([f(1, 0.00002), f(2, 0.002)], PLACE_MODELS),
    ).toEqual([1]);
    expect(
      placeReplacementIds(
        [
          {
            ...f(3, 0.00002),
            geometry: {
              type: "MultiPolygon",
              coordinates: [
                f(3, 0.00002).geometry.coordinates,
                f(3, 0.002).geometry.coordinates,
              ],
            },
          },
        ],
        PLACE_MODELS,
      ),
    ).toEqual([]);
  });
  it("keeps enhanced paths inside mapped campuses and uses the published prison perimeter", () => {
    const data = createSiteDetails();
    expect(data.features.length).toBeGreaterThan(70);
    for (const f of data.features.filter(
      (f) => f.properties!.kind === "path" && f.properties!.site in footprints,
    )) {
      const ring = footprints[f.properties!.site as "zoo"].coordinates;
      if (f.geometry.type === "LineString")
        for (const p of f.geometry.coordinates)
          expect(insideSite(p, ring)).toBe(true);
    }
    expect(
      data.features.filter((f) => f.properties!.kind === "wall"),
    ).toHaveLength(footprints.jail.coordinates.length - 1);
    expect(
      data.features.filter((f) => f.properties!.kind === "pitch"),
    ).toHaveLength(1);
  });
});
