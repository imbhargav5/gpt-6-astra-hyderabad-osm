import type { Feature, Polygon } from "geojson";
import { plainFeature } from "./spatial-stream";
import { describe, expect, it, vi } from "vitest";
import { ResourceCache, inStreamBounds, streamBounds } from "./spatial-stream";
import { createPlaceModels } from "./place-geometry";
import { PlaceMesh } from "./place-mesh";
import { projectMercator } from "./flyover-geometry";
import { MercatorCoordinate } from "maplibre-gl";

describe("spatial detail streaming", () => {
  it("prefetches across the edge of the view without selecting distant sites", () => {
    const bounds = streamBounds({
      getWest: () => 78.46,
      getEast: () => 78.48,
      getSouth: () => 17.4,
      getNorth: () => 17.42,
    });
    expect(inStreamBounds([78.482, 17.41], bounds)).toBe(true);
    expect(inStreamBounds([78.39, 17.43], bounds)).toBe(false);
  });
  it("evicts least recently used resources and releases their GPU allocation", () => {
    const release = vi.fn();
    const cache = new ResourceCache<string>(10, release);
    cache.set("a", "mesh-a", 5);
    cache.set("b", "mesh-b", 5);
    cache.get("a");
    cache.set("c", "mesh-c", 5);
    expect([...cache.keys()]).toEqual(["a", "c"]);
    expect(release).toHaveBeenCalledWith("mesh-b");
    expect(cache.bytes).toBe(10);
    cache.clear();
    expect(cache.bytes).toBe(0);
    expect(release).toHaveBeenCalledTimes(3);
  });
  it("keeps visible geometry even over budget, then frees it after leaving the view", () => {
    const release = vi.fn();
    const cache = new ResourceCache<string>(5, release);
    const visible = new Set(["a", "b"]);
    cache.set("a", "a", 5, visible);
    cache.set("b", "b", 5, visible);
    expect(cache.bytes).toBe(10);
    expect(release).not.toHaveBeenCalled();
    cache.trim(new Set(["b"]));
    expect(cache.bytes).toBe(5);
    expect(cache.get("b")).toBe("b");
  });
  it("releases replaced terrain geometry exactly once", () => {
    const release = vi.fn();
    const cache = new ResourceCache<string>(10, release);
    cache.set("cell", "old", 6);
    cache.set("cell", "new", 4);
    expect(cache.bytes).toBe(4);
    expect(release.mock.calls).toEqual([["old"]]);
  });
  it("does not generate any meshes while loading landmark metadata", () => {
    const finish = vi.spyOn(PlaceMesh.prototype, "finish");
    const models = createPlaceModels();
    expect(models.length).toBeGreaterThan(5);
    expect(finish).not.toHaveBeenCalled();
    const mesh = models[0].mesh;
    expect(mesh.length).toBeGreaterThan(0);
    expect(models[0].mesh).toBe(mesh);
    expect(finish).toHaveBeenCalledTimes(1);
    finish.mockRestore();
  });
  it("keeps worker projection identical to the renderer across the city", () => {
    for (const p of [
      [78.23, 17.2],
      [78.43, 17.4],
      [78.63, 17.575],
    ] as [number, number][]) {
      const expected = MercatorCoordinate.fromLngLat(p);
      const actual = projectMercator(p);
      expect(actual.x).toBe(expected.x);
      expect(actual.y).toBe(expected.y);
    }
  });
});

it("materializes prototype geometry getters before worker transfer", () => {
  class TileFeature {
    type = "Feature" as const;
    id = 12;
    properties = { render_height: 30 };
    get geometry(): Polygon {
      return {
        type: "Polygon",
        coordinates: [
          [
            [78.4, 17.4],
            [78.401, 17.4],
            [78.401, 17.401],
            [78.4, 17.4],
          ],
        ],
      };
    }
  }
  const feature: Feature<Polygon> = new TileFeature();
  expect(structuredClone(feature).geometry).toBeUndefined();
  expect(structuredClone(plainFeature(feature)).geometry).toEqual(
    feature.geometry,
  );
});
