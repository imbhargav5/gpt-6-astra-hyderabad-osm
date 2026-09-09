import { describe, it, expect } from "vitest";
import {
  runwayProfiles,
  runwayElevation,
  affectsRunway,
  correctTerrainPixels,
  tileLngLat,
} from "./runway-terrain";
import { buildFlyovers, type ElevatedRoad } from "./flyovers";
import { buildDeckProfiles, deckGround, profileKey } from "./flyover-profile";
import { createFlyoverMesh } from "./flyover-geometry";
const road: ElevatedRoad = {
  id: 1,
  name: "test",
  highway: "primary",
  layer: 1,
  lanes: 2,
  width: 12,
  coordinates: [
    [78.4, 17.4],
    [78.402, 17.4],
    [78.404, 17.4],
  ],
};
describe("engineered infrastructure elevations", () => {
  it("replaces runway bumps with a gentle continuous grade and leaves distant terrain intact", () => {
    for (const r of runwayProfiles)
      for (const t of [0, 0.1, 0.5, 0.9, 1]) {
        const lng = r.a[0] + (r.b[0] - r.a[0]) * t,
          lat = r.a[1] + (r.b[1] - r.a[1]) * t;
        expect(
          runwayElevation(lng, lat, 400 + 100 * Math.sin(t * 20)),
        ).toBeCloseTo(r.start + (r.end - r.start) * t, 2);
      }
    expect(runwayElevation(78.4, 17.4, 543)).toBe(543);
  });
  it("blends runway shoulders smoothly back into the original terrain", () => {
    const r = runwayProfiles[0],
      lng = (r.a[0] + r.b[0]) / 2,
      lat = (r.a[1] + r.b[1]) / 2;
    const values = [0, 70, 120, 180, 250].map((m) =>
      runwayElevation(lng, lat + m / 111320, 700),
    );
    expect(values[0]).toBeLessThan(values[1]);
    for (let i = 1; i < values.length; i++)
      expect(values[i]).toBeGreaterThanOrEqual(values[i - 1]);
    expect(values.at(-1)).toBe(700);
  });
  it("encodes corrected heights into DEM pixels without touching alpha or unrelated pixels", () => {
    const r = runwayProfiles[0],
      z = 14,
      n = 2 ** z,
      lng = (r.a[0] + r.b[0]) / 2,
      lat = (r.a[1] + r.b[1]) / 2;
    const x = Math.floor(((lng + 180) / 360) * n),
      y = Math.floor(
        ((1 - Math.asinh(Math.tan((lat * Math.PI) / 180)) / Math.PI) / 2) * n,
      );
    expect(affectsRunway(z, x, y)).toBe(true);
    const pixels = new Uint8ClampedArray(256 * 256 * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 130;
      pixels[i + 1] = 88;
      pixels[i + 3] = 255;
    }
    correctTerrainPixels(pixels, 256, z, x, y);
    let changed = 0;
    for (let row = 0; row < 256; row++)
      for (let col = 0; col < 256; col++) {
        const i = (row * 256 + col) * 4,
          [a, b] = tileLngLat(z, x + (col + 0.5) / 256, y + (row + 0.5) / 256);
        const value =
          pixels[i] * 256 + pixels[i + 1] + pixels[i + 2] / 256 - 32768;
        expect(value).toBeCloseTo(runwayElevation(a, b, 600), 2);
        expect(pixels[i + 3]).toBe(255);
        if (value !== 600) changed++;
      }
    expect(changed).toBeGreaterThan(0);
  });
  it("limits connected deck grades, keeps cross-sections level, and ignores building exaggeration", () => {
    const data = buildFlyovers([road]);
    const sample = (p: number[]) =>
      100 + 25 * Math.exp(-(((p[0] - 78.402) / 0.0001) ** 2));
    const profiles = buildDeckProfiles(data, sample);
    for (const f of data.features.filter(
      (f) => f.properties!.part === "deck",
    )) {
      const { a, b } = f.properties!;
      const d = Math.hypot((b[0] - a[0]) * 106100, (b[1] - a[1]) * 111320);
      expect(
        Math.abs(profiles.get(profileKey(a))! - profiles.get(profileKey(b))!),
      ).toBeLessThanOrEqual(d * 0.04 + 1e-5);
      const x = (a[0] + b[0]) / 2,
        y = (a[1] + b[1]) / 2;
      expect(deckGround([x, y - 0.00005], a, b, profiles)).toBeCloseTo(
        deckGround([x, y + 0.00005], a, b, profiles)!,
      );
    }
    expect(
      createFlyoverMesh(
        data,
        1,
        sample,
        road.coordinates[0],
        Infinity,
        profiles,
      ),
    ).toEqual(
      createFlyoverMesh(
        data,
        4,
        sample,
        road.coordinates[0],
        Infinity,
        profiles,
      ),
    );
  });
  it("shares grades across route and chunk boundaries, and waits on unavailable terrain", () => {
    const next = {
      ...road,
      id: 2,
      coordinates: [road.coordinates[2], [78.405, 17.401]],
    };
    const all = buildFlyovers([road, next]);
    const profiles = buildDeckProfiles(all, () => 123);
    for (const f of all.features) {
      const { a, b } = f.properties!;
      expect(deckGround(a, a, b, profiles)).toBe(123);
    }
    const only = { ...all, features: all.features.slice(10, 20) };
    expect(
      createFlyoverMesh(
        only,
        1,
        () => 0,
        road.coordinates[0],
        Infinity,
        profiles,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      createFlyoverMesh(all, 1, () => null, road.coordinates[0], Infinity),
    ).toHaveLength(0);
  });
});
