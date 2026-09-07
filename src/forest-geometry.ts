import type {
  Position,
  Polygon,
  MultiPolygon,
  LineString,
  MultiLineString,
} from "geojson";
export type ForestShape = Polygon | MultiPolygon | LineString | MultiLineString;
export function inRing(x: number, y: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > y !== b[1] > y &&
      x < ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export function inPolygon(x: number, y: number, rings: Position[][]): boolean {
  return Boolean(
    rings.length &&
    inRing(x, y, rings[0]) &&
    !rings.slice(1).some((ring) => inRing(x, y, ring)),
  );
}
export function containsTree(
  x: number,
  y: number,
  shape: ForestShape,
): boolean {
  if (shape.type === "Polygon") return inPolygon(x, y, shape.coordinates);
  if (shape.type === "MultiPolygon")
    return shape.coordinates.some((p) => inPolygon(x, y, p));
  const lines =
    shape.type === "LineString" ? [shape.coordinates] : shape.coordinates;
  return lines.some((line) =>
    line.slice(1).some((b, i) => {
      const a = line[i],
        dx = (b[0] - a[0]) * 0.954,
        dy = b[1] - a[1];
      const px = (x - a[0]) * 0.954,
        py = y - a[1];
      const t = Math.max(
        0,
        Math.min(1, (px * dx + py * dy) / (dx * dx + dy * dy || 1)),
      );
      return Math.hypot(px - t * dx, py - t * dy) < 12 / 111320;
    }),
  );
}
export function seededCell(x: number, y: number): number {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Smooth deterministic patches for canopy density and ground grain. */
export function patchNoise(x: number, y: number): number {
  const ix = Math.floor(x),
    iy = Math.floor(y);
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const fx = smooth(x - ix),
    fy = smooth(y - iy);
  const a = seededCell(ix, iy) * (1 - fx) + seededCell(ix + 1, iy) * fx;
  const b = seededCell(ix, iy + 1) * (1 - fx) + seededCell(ix + 1, iy + 1) * fx;
  return a * (1 - fy) + b * fy;
}
