import { describe, expect, it } from "vitest";
import type { Feature, Polygon } from "geojson";
import {
  buildLandmarkDetails,
  detailSites,
  MAX_DETAILS,
} from "./landmark-detail";
import { charminarModel, charminarReplacementIds } from "./charminar";
import { landmarks } from "./landmarks";

function building(id: string, hole = false): Feature<Polygon> {
  const [lng, lat] = landmarks.find((l) => l.id === id)!.coordinates;
  const ring = (size: number) => [
    [lng - size, lat - size],
    [lng + size, lat - size],
    [lng + size, lat + size],
    [lng - size, lat + size],
    [lng - size, lat - size],
  ];
  return {
    type: "Feature",
    id: 42,
    properties: { render_height: 18, render_min_height: 0 },
    geometry: {
      type: "Polygon",
      coordinates: hole
        ? [ring(0.0003), ring(0.00006).reverse()]
        : [ring(0.0003)],
    },
  };
}

describe("landmark architecture", () => {
  it("preserves courtyard holes and keeps façade geometry at the mapped boundary", () => {
    const input = building("falaknuma", true);
    const details = buildLandmarkDetails([input]).features.filter(
      (f) => f.properties.site === "falaknuma",
    );
    expect(details.length).toBeGreaterThan(100);
    const roof = details.find((f) => f.properties.base === 18.04)!;
    expect(roof.geometry.coordinates).toHaveLength(2);
    expect(roof.geometry.coordinates[0][0][0]).toBeCloseTo(
      input.geometry.coordinates[0][0][0],
      9,
    );
    for (const f of details) {
      expect(f.properties.top).toBeGreaterThan(f.properties.base);
      for (const ring of f.geometry.coordinates) {
        expect(ring[0]).toEqual(ring.at(-1));
        for (const [x, y] of ring) {
          expect(Number.isFinite(x)).toBe(true);
          expect(Number.isFinite(y)).toBe(true);
        }
      }
    }
  });
  it("does not duplicate decorations from repeated tile features", () => {
    const input = building("cyber-towers");
    expect(buildLandmarkDetails([input, input])).toEqual(
      buildLandmarkDetails([input]),
    );
  });
  it("leaves natural tour stops and hidden footprints unadorned", () => {
    const hidden = building("falaknuma");
    hidden.properties!.hide_3d = true;
    const result = buildLandmarkDetails([building("gandipet"), hidden]);
    expect(new Set(result.features.map((f) => f.properties.site))).toEqual(
      new Set(["charminar"]),
    );
  });
  it("covers each curated architectural site and bounds geometry size", () => {
    for (const id of Object.keys(detailSites)) {
      const result = buildLandmarkDetails([building(id)]);
      expect(
        result.features.some((f) => f.properties.site === id),
        id,
      ).toBe(true);
      expect(result.features.length).toBeLessThanOrEqual(MAX_DETAILS);
    }
  });
  it("keeps Charminar passages open and its four finials at the same elevation", () => {
    const model = charminarModel();
    const finials = model.features.filter((f) => f.properties.top === 48.7);
    expect(finials).toHaveLength(4);
    // No ground-level component covers the center: the monument has crossing passages.
    const center = [78.47464, 17.361603];
    for (const f of model.features.filter((f) => f.properties.base === 0)) {
      const ring = f.geometry.coordinates[0];
      const xs = ring.map((p) => p[0]),
        ys = ring.map((p) => p[1]);
      expect(
        center[0] > Math.min(...xs) &&
          center[0] < Math.max(...xs) &&
          center[1] > Math.min(...ys) &&
          center[1] < Math.max(...ys),
      ).toBe(false);
    }
  });
  it("suppresses only mapped monument parts, leaving neighboring buildings intact", () => {
    const geometry = charminarModel().features[0].geometry;
    const monument = {
      type: "Feature" as const,
      id: 123,
      properties: {},
      geometry,
    };
    const neighbor = building("mecca-masjid");
    expect(charminarReplacementIds([monument, neighbor])).toEqual([123]);
    const merged = {
      ...monument,
      geometry: {
        type: "MultiPolygon" as const,
        coordinates: [geometry.coordinates, neighbor.geometry.coordinates],
      },
    };
    expect(charminarReplacementIds([merged])).toEqual([]);
  });
  it("caps dense high-rise detail generation", () => {
    const inputs = Array.from({ length: 50 }, (_, id) => ({
      ...building("financial-district"),
      id,
      properties: { render_height: 240 },
    }));
    const result = buildLandmarkDetails(inputs);
    expect(result.features).toHaveLength(MAX_DETAILS);
  });
  it("prioritizes the current district over cached buildings at other stops", () => {
    const dense = Array.from({ length: 36 }, (_, id) => ({
      ...building("financial-district"),
      id,
      properties: { render_height: 240 },
    }));
    const result = buildLandmarkDetails(
      [...dense, building("kokapet")],
      landmarks.find((l) => l.id === "kokapet")!.coordinates,
    );
    expect(
      result.features.find((f) => f.properties.site !== "charminar")?.properties
        .site,
    ).toBe("kokapet");
  });
});
