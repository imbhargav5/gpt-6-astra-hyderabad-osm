import {
  flyoverMeshLayer,
  updateFlyoverMesh,
  type FlyoverSettings,
} from "./flyover-mesh";
import type { FeatureCollection, Polygon, Position } from "geojson";
import type { Map, GeoJSONSource, MapSourceDataEvent } from "maplibre-gl";
import roads from "./data/flyovers.json";
import { CITY_BOUNDS } from "./city-slab";
export interface ElevatedRoad {
  id: number;
  name: string;
  highway: string;
  layer: number;
  lanes: number;
  width: number;
  coordinates: Position[];
}
export function buildFlyovers(
  routes: ElevatedRoad[],
): FeatureCollection<Polygon> {
  const features: FeatureCollection<Polygon>["features"] = [];
  const add = (
    ring: Position[],
    base: number,
    top: number,
    part: string,
    road: ElevatedRoad,
  ) => {
    if (ring.length < 4 || features.length >= 60000) return;
    features.push({
      type: "Feature",
      properties: { base, top, part, name: road.name, road: road.id },
      geometry: { type: "Polygon", coordinates: [ring] },
    });
  };
  for (const road of routes) {
    const coords: Position[] = [];
    for (let i = 0; i < road.coordinates.length; i++) {
      const a = road.coordinates[i];
      if (i === 0) {
        coords.push(a);
        continue;
      }
      const prev = road.coordinates[i - 1],
        steps = Math.max(
          1,
          Math.ceil(
            Math.hypot((a[0] - prev[0]) * 106100, (a[1] - prev[1]) * 111320) /
              20,
          ),
        );
      for (let j = 1; j <= steps; j++)
        coords.push([
          prev[0] + ((a[0] - prev[0]) * j) / steps,
          prev[1] + ((a[1] - prev[1]) * j) / steps,
        ]);
    }
    if (coords.length < 2) continue;
    // The lake's cable bridge has its own detailed model.
    if (
      coords.some(
        (p) =>
          Math.abs(p[0] - 78.38988) < 0.002 &&
          Math.abs(p[1] - 17.43169) < 0.00065,
      )
    )
      continue;
    const origin = coords[0],
      mx = 111320 * Math.cos((origin[1] * Math.PI) / 180);
    const p = coords.map((q) => [
      (q[0] - origin[0]) * mx,
      (q[1] - origin[1]) * 111320,
    ]);
    const geo = (q: Position) => [
      origin[0] + q[0] / mx,
      origin[1] + q[1] / 111320,
    ];
    const width = Math.max(
      5,
      Math.min(30, road.width || road.lanes * 3.3 + 1.4),
    );
    const deck = 7 + Math.max(0, road.layer - 1) * 6;
    let travelled = 0,
      nextPier = 22,
      nextDash = 5;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1],
        b = p[i],
        len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.1) continue;
      const ux = (b[0] - a[0]) / len,
        uy = (b[1] - a[1]) / len;
      const rect = (start: number, end: number, lo: number, hi: number) => {
        const point = (d: number, n: number) =>
          geo([a[0] + ux * d - uy * n, a[1] + uy * d + ux * n]);
        return [
          point(start, lo),
          point(end, lo),
          point(end, hi),
          point(start, hi),
          point(start, lo),
        ];
      };
      const mid = geo([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]);
      if (
        mid[0] < CITY_BOUNDS[0] ||
        mid[0] > CITY_BOUNDS[2] ||
        mid[1] < CITY_BOUNDS[1] ||
        mid[1] > CITY_BOUNDS[3]
      ) {
        travelled += len;
        continue;
      }
      add(
        rect(-0.25, len + 0.25, -width / 2, width / 2),
        deck - 1.2,
        deck,
        "deck",
        road,
      );
      add(
        rect(-0.25, len + 0.25, -width / 2 + 0.5, width / 2 - 0.5),
        deck,
        deck + 0.08,
        "surface",
        road,
      );
      for (const side of [-1, 1])
        add(
          rect(
            -0.3,
            len + 0.3,
            (side * width) / 2 - 0.22,
            (side * width) / 2 + 0.22,
          ),
          deck,
          deck + 0.85,
          "barrier",
          road,
        );
      while (nextPier < travelled) nextPier += 45;
      while (nextPier < travelled + len) {
        const d = nextPier - travelled;
        add(rect(d - 0.8, d + 0.8, -0.8, 0.8), 0, deck - 1.9, "pier", road);
        add(
          rect(d - 1.2, d + 1.2, -width * 0.35, width * 0.35),
          deck - 1.9,
          deck - 1.2,
          "pier",
          road,
        );
        nextPier += 45;
      }
      while (nextDash < travelled) nextDash += 22;
      while (nextDash < travelled + len) {
        const d = nextDash - travelled;
        for (let lane = 1; lane < road.lanes; lane++) {
          const n = -width / 2 + (lane * width) / road.lanes;
          add(
            rect(d, Math.min(d + 7, len), n - 0.09, n + 0.09),
            deck + 0.08,
            deck + 0.12,
            "marking",
            road,
          );
        }
        nextDash += 22;
      }
      travelled += len;
    }
  }
  return { type: "FeatureCollection", features };
}
export const elevatedRoads = roads as ElevatedRoad[];
export function installFlyovers(map: Map) {
  if (map.getSource("flyovers")) return;
  const data = buildFlyovers(elevatedRoads);
  map.addSource("flyovers", {
    type: "geojson",
    data,
    tolerance: 0,
    maxzoom: 18,
  });
  map.addLayer(flyoverMeshLayer(data), "water-labels");
  map.getContainer().dataset.flyoverRoads = String(elevatedRoads.length);
}
export function applyFlyoverSettings(map: Map, s: FlyoverSettings) {
  updateFlyoverMesh(map, undefined, s);
}

/** Extend the checked-in corridor data with bridges in the live vector tiles. */
export function watchFlyovers(map: Map) {
  let timer: ReturnType<typeof setTimeout> | undefined,
    signature = "";
  const nearSnapshot = (p: Position) =>
    elevatedRoads.some((r) =>
      r.coordinates.slice(1).some((b, i) => {
        const a = r.coordinates[i],
          dx = (b[0] - a[0]) * 106100,
          dy = (b[1] - a[1]) * 111320,
          px = (p[0] - a[0]) * 106100,
          py = (p[1] - a[1]) * 111320;
        const t = Math.max(
          0,
          Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)),
        );
        return Math.hypot(px - t * dx, py - t * dy) < 3;
      }),
    );
  const refresh = () => {
    timer = undefined;
    if (!map.getSource("flyovers") || map.isMoving() || map.getZoom() < 12)
      return;
    const extra: ElevatedRoad[] = [],
      seen = new Set<string>();
    for (const f of map.querySourceFeatures("osm", {
      sourceLayer: "transportation",
    })) {
      const t = f.properties;
      if (
        t.brunnel !== "bridge" ||
        !["motorway", "trunk", "primary", "secondary", "tertiary"].includes(
          t.class,
        )
      )
        continue;
      const lines =
        f.geometry.type === "LineString"
          ? [f.geometry.coordinates]
          : f.geometry.type === "MultiLineString"
            ? f.geometry.coordinates
            : [];
      for (const coordinates of lines) {
        const key = JSON.stringify(coordinates);
        if (seen.has(key)) continue;
        seen.add(key);
        if (coordinates.every(nearSnapshot)) continue;
        extra.push({
          id: -extra.length - 1,
          name: t.name || "Mapped flyover",
          highway: t.class,
          layer: Math.max(1, Number(t.layer) || 1),
          lanes: Math.max(1, Math.min(6, Number(t.lanes) || 2)),
          width: 0,
          coordinates,
        });
      }
    }
    const next = JSON.stringify(extra);
    if (next === signature) return;
    signature = next;
    const data = buildFlyovers([...elevatedRoads, ...extra]);
    (map.getSource("flyovers") as GeoJSONSource).setData(data);
    updateFlyoverMesh(map, data);
    map.getContainer().dataset.flyoverRoads = String(
      elevatedRoads.length + extra.length,
    );
  };
  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(refresh, 350);
  };
  const source = (e: MapSourceDataEvent) => {
    if (e.sourceId === "osm" && e.sourceDataType === "content") schedule();
  };
  map.on("moveend", schedule);
  map.on("sourcedata", source);
  map.on("style.load", schedule);
  return () => {
    if (timer) clearTimeout(timer);
    map.off("moveend", schedule);
    map.off("sourcedata", source);
    map.off("style.load", schedule);
  };
}
