import { campusBoundaries, inCampus } from "./campus-surfaces";
import { campusProfiles, type CampusProfile } from "./campus-sites";
import { charminarModel } from "./charminar";
import { landmarks } from "./landmarks";
import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
  Position,
} from "geojson";
type Architecture =
  CampusProfile | "palace" | "fort" | "monument" | "civic" | "glass";
export const detailSites: Record<
  string,
  { style: Architecture; radius: number; area: number }
> = {
  ...campusProfiles,
  "chanchalguda-jail": { style: "civic", radius: 210, area: 70 },
  "nehru-zoo": { style: "civic", radius: 700, area: 100 },
  "parade-grounds": { style: "civic", radius: 250, area: 100 },
  "gymkhana-grounds": { style: "civic", radius: 200, area: 100 },
  charminar: { style: "monument", radius: 28, area: 25 },
  golconda: { style: "fort", radius: 240, area: 55 },
  "cyber-towers": { style: "glass", radius: 170, area: 450 },
  "financial-district": { style: "glass", radius: 650, area: 650 },
  kokapet: { style: "glass", radius: 600, area: 650 },
  "t-hub": { style: "glass", radius: 130, area: 400 },
  secretariat: { style: "civic", radius: 220, area: 300 },
  chowmahalla: { style: "palace", radius: 160, area: 100 },
  "mecca-masjid": { style: "monument", radius: 100, area: 150 },
  falaknuma: { style: "palace", radius: 190, area: 100 },
  airport: { style: "glass", radius: 650, area: 2000 },
};

type Building = Feature<Polygon | MultiPolygon>;
type Material = "stone" | "trim" | "recess" | "glass" | "roof" | "metal";
type Detail = Feature<
  Polygon,
  { base: number; top: number; material: Material; fine: number; site: string }
>;
const METERS_LAT = 111320;
const MAX_BUILDINGS = 36;
export const MAX_DETAILS = 8000;
export const DETAIL_SOURCE = "landmark-architecture";
export const DETAIL_LAYERS = ["landmark-massing", "landmark-facades"];

function area(ring: Position[]) {
  return Math.abs(
    ring
      .slice(1)
      .reduce((sum, p, i) => sum + ring[i][0] * p[1] - p[0] * ring[i][1], 0) /
      2,
  );
}

/** Decorative geometry follows the tile footprints. It is not a measured reconstruction. */
export function buildLandmarkDetails(
  buildings: Building[],
  focus?: Position,
): FeatureCollection<Polygon, Detail["properties"]> {
  const features: Detail[] = [...charminarModel().features];
  const seen = new Set<string>();
  const candidates: {
    rings: Position[][];
    site: string;
    style: Architecture;
    height: number;
    base: number;
    distance: number;
    anchor: Position;
    mx: number;
  }[] = [];
  for (const building of buildings) {
    if (building.properties?.hide_3d === true) continue;
    const polygons =
      building.geometry.type === "Polygon"
        ? [building.geometry.coordinates]
        : building.geometry.coordinates;
    for (const rings of polygons) {
      if (!rings[0] || rings[0].length < 4) continue;
      const outer = rings[0].slice(0, -1);
      const anchor = outer.reduce(
        (sum, p) => [
          sum[0] + p[0] / outer.length,
          sum[1] + p[1] / outer.length,
        ],
        [0, 0],
      );
      const mx = METERS_LAT * Math.cos((anchor[1] * Math.PI) / 180);
      const local = rings.map((r) =>
        r.map((p) => [
          (p[0] - anchor[0]) * mx,
          (p[1] - anchor[1]) * METERS_LAT,
        ]),
      );
      const footprintArea =
        area(local[0]) - local.slice(1).reduce((sum, r) => sum + area(r), 0);
      const site = landmarks
        .map((l) => ({
          landmark: l,
          spec: detailSites[l.id],
          distance: Math.hypot(
            (l.coordinates[0] - anchor[0]) * mx,
            (l.coordinates[1] - anchor[1]) * METERS_LAT,
          ),
        }))
        .filter(
          (s) =>
            s.spec &&
            s.distance <= s.spec.radius &&
            (!(s.landmark.id in campusBoundaries) ||
              !campusBoundaries[s.landmark.id as keyof typeof campusBoundaries]
                .boundary.length ||
              inCampus(
                anchor,
                campusBoundaries[s.landmark.id as keyof typeof campusBoundaries]
                  .boundary,
              )) &&
            footprintArea >= s.spec.area,
        )
        .sort((a, b) => a.distance - b.distance)[0];
      if (!site || site.landmark.id === "charminar") continue;
      const height = Math.max(
        3,
        Number(building.properties?.render_height ?? 9),
      );
      const base = Math.max(
        0,
        Number(building.properties?.render_min_height ?? 0),
      );
      if (
        !Number.isFinite(height) ||
        !Number.isFinite(base) ||
        height - base < 3
      )
        continue;
      // Full coordinate signature retains separate building parts while rejecting tile duplicates.
      const key = `${building.id ?? ""}:${height}:${JSON.stringify(rings)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({
        rings: local,
        site: site.landmark.id,
        style: site.spec.style,
        height,
        base,
        distance: site.distance,
        anchor,
        mx,
      });
    }
  }
  const priority = (b: (typeof candidates)[number]) =>
    focus
      ? Math.hypot(
          (b.anchor[0] - focus[0]) * b.mx,
          (b.anchor[1] - focus[1]) * METERS_LAT,
        )
      : b.distance;
  candidates.sort((a, b) => priority(a) - priority(b));
  for (const b of candidates.slice(0, MAX_BUILDINGS)) {
    if (features.length >= MAX_DETAILS) break;
    const { height: h, base, style, rings, anchor, mx, site } = b;
    const modern = [
      "glass",
      "mall",
      "hospital",
      "industrial",
      "residential",
      "office",
    ].includes(style);
    const industrial = style === "industrial";
    const hospital = style === "hospital";
    const residential = style === "residential";
    const fort = style === "fort";
    const storey = industrial
      ? 6
      : residential
        ? 3
        : modern
          ? 4
          : fort
            ? 5
            : 4.5;
    const levels = Math.min(28, Math.max(1, Math.floor((h - base) / storey)));
    const floorHeight = (h - base) / levels;
    const geo = (r: Position[]) =>
      r.map((p) => [anchor[0] + p[0] / mx, anchor[1] + p[1] / METERS_LAT]);
    const add = (
      coordinates: Position[][],
      z: number,
      top: number,
      material: Material,
      fine = 0,
    ) => {
      if (features.length >= MAX_DETAILS || top <= z) return;
      features.push({
        type: "Feature",
        properties: { base: z, top, material, fine, site },
        geometry: { type: "Polygon", coordinates: coordinates.map(geo) },
      });
    };
    // Preserve every courtyard hole in the roof, rather than closing it with a bounding box.
    add(rings, h + 0.04, h + 0.22, modern ? "roof" : "stone");
    for (const ring of rings)
      for (let edge = 0; edge < ring.length - 1; edge++) {
        if (features.length >= MAX_DETAILS) break;
        const a = ring[edge],
          c = ring[edge + 1];
        const length = Math.hypot(c[0] - a[0], c[1] - a[1]);
        if (length < 1.8) continue;
        const ux = (c[0] - a[0]) / length,
          uy = (c[1] - a[1]) / length;
        // Thin strips straddle the actual wall so both ring winding directions work.
        const strip = (
          start: number,
          end: number,
          depth: number,
          z: number,
          top: number,
          material: Material,
          fine = 0,
        ) => {
          const point = (d: number, n: number) => [
            a[0] + ux * d - uy * n,
            a[1] + uy * d + ux * n,
          ];
          const p = [
            point(start, -depth),
            point(end, -depth),
            point(end, depth),
            point(start, depth),
          ];
          add([[...p, p[0]]], z, top, material, fine);
        };
        // A projecting cornice, darker roof coping and a grounded plinth.
        strip(0, length, modern ? 0.24 : 0.48, h - 0.4, h + 0.25, "trim");
        strip(
          0,
          length,
          0.18,
          h + 0.25,
          h + (fort ? 0.8 : 0.65),
          modern ? "metal" : "stone",
        );
        strip(0, length, 0.28, base + 0.06, base + 0.6, "stone");
        if (fort) {
          const bays = Math.min(35, Math.floor(length / 3));
          for (let bay = 0; bay < bays; bay++) {
            const x = ((bay + 0.5) * length) / bays;
            strip(x - 0.65, x + 0.65, 0.4, h + 0.65, h + 1.45, "stone", 1);
          }
          continue;
        }
        const bays = Math.min(32, Math.floor(length / (modern ? 4.2 : 4.5)));
        if (!bays) continue;
        const spacing = length / bays;
        for (let floor = 0; floor < levels; floor++) {
          const bottom = base + floor * floorHeight;
          if (floor > 0)
            strip(
              0,
              length,
              modern ? 0.22 : 0.34,
              bottom - 0.12,
              bottom + 0.16,
              "trim",
              1,
            );
          for (let bay = 0; bay < bays; bay++) {
            const center = (bay + 0.5) * spacing;
            const width =
              spacing *
              (industrial
                ? 0.5
                : hospital || residential
                  ? 0.55
                  : modern
                    ? 0.78
                    : 0.44);
            const sill = bottom + floorHeight * 0.24;
            const top = bottom + floorHeight * 0.78;
            strip(
              center - width / 2 - 0.14,
              center + width / 2 + 0.14,
              0.23,
              sill - 0.16,
              top + 0.18,
              "trim",
              1,
            );
            strip(
              center - width / 2,
              center + width / 2,
              0.27,
              sill,
              modern ? top : top - width * 0.25,
              modern ? "glass" : "recess",
              1,
            );
            if (!modern) {
              // Stepped arch heads give depth to heritage windows without flat image billboards.
              for (let step = 0; step < 5; step++) {
                const t = (step + 0.5) / 5;
                const half = (width / 2) * Math.sqrt(1 - t * t);
                const z = top - width * 0.25 + step * width * 0.05;
                strip(
                  center - half,
                  center + half,
                  0.27,
                  z,
                  z + width * 0.05 + 0.01,
                  "recess",
                  1,
                );
              }
              strip(
                center - width / 2 - 0.25,
                center + width / 2 + 0.25,
                0.42,
                sill - 0.22,
                sill - 0.08,
                "trim",
                1,
              );
            } else {
              if (hospital || residential)
                strip(
                  center - width / 2 - 0.3,
                  center + width / 2 + 0.3,
                  0.65,
                  top + 0.15,
                  top + 0.35,
                  "trim",
                  1,
                );
              strip(center - 0.04, center + 0.04, 0.3, sill, top, "metal", 1);
            }
          }
        }
        if (style === "mall" || style === "office")
          for (let d = 2; d < length; d += 6)
            strip(d - 0.14, d + 0.14, 0.55, base + 0.6, h - 0.5, "metal", 1);
        if ((industrial || style === "mall") && edge === 0) {
          const minY = Math.min(...rings[0].map((p) => p[1])),
            maxY = Math.max(...rings[0].map((p) => p[1]));
          for (let y = minY + 3; y < maxY - 3; y += industrial ? 6 : 15) {
            const crossings: number[] = [];
            for (const r of rings)
              for (let j = 1; j < r.length; j++) {
                const a = r[j - 1],
                  b = r[j];
                if (a[1] > y !== b[1] > y)
                  crossings.push(
                    a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]),
                  );
              }
            crossings.sort((a, b) => a - b);
            for (let j = 0; j + 1 < crossings.length; j += 2) {
              const x1 = crossings[j] + 1,
                x2 = crossings[j + 1] - 1;
              if (x2 <= x1) continue;
              const depth = industrial ? 0.1 : 0.8;
              const r = [
                [x1, y - depth],
                [x2, y - depth],
                [x2, y + depth],
                [x1, y + depth],
                [x1, y - depth],
              ];
              if (
                r.every(
                  (p) =>
                    inCampus(p, rings[0]) &&
                    !rings.slice(1).some((hole) => inCampus(p, hole)),
                )
              )
                add(
                  [r],
                  h + 0.23,
                  h + (industrial ? 0.34 : 0.65),
                  industrial ? "metal" : "glass",
                  1,
                );
            }
          }
        }
        if (!modern)
          for (let bay = 1; bay < bays; bay++) {
            const x = bay * spacing;
            strip(x - 0.18, x + 0.18, 0.35, base + 0.6, h - 0.4, "trim", 1);
            strip(x - 0.3, x + 0.3, 0.42, h - 0.9, h - 0.4, "stone", 1);
          }
      }
  }
  return { type: "FeatureCollection", features };
}
