import type { FeatureCollection, Polygon, Position } from "geojson";
import { buildDeckProfiles, deckGround } from "./flyover-profile";
import { PlaceMesh, type V3, type Color } from "./place-mesh";
export const meshOrigin: [number, number] = [78.43, 17.4];
// MapLibre's normalized Web Mercator projection, kept worker-safe without loading the renderer.
export function projectMercator(p: number[]) {
  return {
    x: (180 + p[0]) / 360,
    y:
      (180 -
        (180 / Math.PI) *
          Math.log(Math.tan(Math.PI / 4 + (p[1] * Math.PI) / 360))) /
      360,
  };
}
const origin = projectMercator(meshOrigin),
  unit =
    1 / (2 * Math.PI * 6371008.8 * Math.cos((meshOrigin[1] * Math.PI) / 180));
const materials: Record<string, Color> = {
  deck: [0.59, 0.63, 0.59],
  surface: [0.38, 0.46, 0.45],
  barrier: [0.85, 0.86, 0.77],
  pier: [0.68, 0.71, 0.64],
  marking: [0.97, 0.95, 0.83],
};
export function createFlyoverMesh(
  data: FeatureCollection<Polygon>,
  _height: number,
  elevation: (p: Position) => number | null,
  center: Position,
  radius = 4500,
  profiles = buildDeckProfiles(data, elevation),
) {
  const mesh = new PlaceMesh();
  for (const f of data.features) {
    const ring = f.geometry.coordinates[0].slice(0, -1);
    if (ring.length !== 4) continue;
    if (
      !ring.some(
        (p) =>
          Math.hypot((p[0] - center[0]) * 106100, (p[1] - center[1]) * 111320) <
          radius,
      )
    )
      continue;
    const props = f.properties!;
    // Legacy polygons use one shared centre elevation, never independent corner heights.
    const centre = ring.reduce(
      (v, p) => [v[0] + p[0] / 4, v[1] + p[1] / 4],
      [0, 0],
    );
    const fallback = props.a ? null : elevation(centre);
    const grounds = ring.map((p) =>
      props.a ? deckGround(p, props.a, props.b, profiles) : fallback,
    );
    const footings =
      props.part === "pier" && props.base === 0 ? ring.map(elevation) : grounds;
    if (footings.some((v) => v === null)) continue;
    if (grounds.some((v) => v === null)) continue;
    const points = ring.map((p) => {
      const c = projectMercator(p);
      return [(c.x - origin.x) / unit, (c.y - origin.y) / unit];
    });
    // Keep winding consistent after converting north-positive geographic coordinates to Mercator.
    const area = points.reduce(
      (sum, p, i) =>
        sum + p[0] * points[(i + 1) % 4][1] - points[(i + 1) % 4][0] * p[1],
      0,
    );
    const order = area > 0 ? [0, 1, 2, 3] : [3, 2, 1, 0];
    const top = order.map(
      (i) => [points[i][0], points[i][1], grounds[i]! + props.top] as V3,
    );
    const bottom = order.map(
      (i) => [points[i][0], points[i][1], footings[i]! + props.base] as V3,
    );
    const color = materials[f.properties!.part] ?? materials.deck;
    mesh.quad(top[0], top[1], top[2], top[3], color);
    mesh.quad(bottom[3], bottom[2], bottom[1], bottom[0], color);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      mesh.quad(bottom[i], bottom[j], top[j], top[i], color);
    }
  }
  return mesh.finish();
}
