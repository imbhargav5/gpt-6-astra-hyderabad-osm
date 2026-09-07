import { describe, it, expect } from "vitest";
import { campusPlaces, campusProfiles } from "./campus-sites";
import { landmarks, searchLandmarks } from "./landmarks";
import { CITY_BOUNDS } from "./city-slab";
import {
  campusSurfaceDetails,
  campusBoundaries,
  inCampus,
} from "./campus-surfaces";
import { buildLandmarkDetails } from "./landmark-detail";
import type { Feature, Polygon } from "geojson";
describe("additional city campuses", () => {
  it("adds twelve searchable places without changing the existing marker order", () => {
    expect(landmarks).toHaveLength(39);
    expect(landmarks[0].id).toBe("hussain-sagar");
    for (const p of campusPlaces) {
      expect(searchLandmarks(p.name).map((p) => p.id)).toContain(p.id);
      for (const alias of p.aliases ?? [])
        expect(searchLandmarks(alias).map((p) => p.id)).toContain(p.id);
      expect(p.coordinates[0]).toBeGreaterThan(CITY_BOUNDS[0]);
      expect(p.coordinates[0]).toBeLessThan(CITY_BOUNDS[2]);
      expect(p.coordinates[1]).toBeGreaterThan(CITY_BOUNDS[1]);
      expect(p.coordinates[1]).toBeLessThan(CITY_BOUNDS[3]);
    }
  });
  it("generates architectural detail for all eleven building-based additions", () => {
    for (const p of campusPlaces.filter((p) => p.id in campusProfiles)) {
      const boundary =
        campusBoundaries[p.id as keyof typeof campusBoundaries].boundary;
      const [x, y] = p.coordinates;
      const ring = boundary.length
        ? boundary
        : [
            [x - 0.0001, y - 0.0001],
            [x + 0.0001, y - 0.0001],
            [x + 0.0001, y + 0.0001],
            [x - 0.0001, y + 0.0001],
            [x - 0.0001, y - 0.0001],
          ];
      const f: Feature<Polygon> = {
        type: "Feature",
        id: p.id,
        properties: { render_height: 24 },
        geometry: { type: "Polygon", coordinates: [ring] },
      };
      const data = buildLandmarkDetails([f], p.coordinates);
      expect(
        data.features.some((f) => f.properties.site === p.id),
        p.id,
      ).toBe(true);
    }
  });
  it("has mapped airfield surfaces and clips park paths to the park", () => {
    const f = campusSurfaceDetails();
    for (const id of ["begumpet-airport", "hakimpet"])
      expect(
        f.some(
          (f) => f.properties!.site === id && f.properties!.kind === "runway",
        ),
      ).toBe(true);
    const paths = f.filter(
      (f) =>
        f.properties!.site === "biodiversity-park" &&
        f.properties!.kind === "path",
    );
    expect(paths.length).toBeGreaterThan(0);
    for (const p of paths)
      if (p.geometry.type === "LineString")
        for (const point of p.geometry.coordinates)
          expect(
            inCampus(point, campusBoundaries["biodiversity-park"].boundary),
          ).toBe(true);
  });
});
