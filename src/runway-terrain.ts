import runways from "./data/runway-profiles.json";

// Visual grade estimates fitted to the same DEM, not surveyed airport elevations.
export const runwayProfiles = runways;
export function runwayElevation(lng: number, lat: number, original: number) {
  let weight = 0,
    target = 0;
  for (const r of runways) {
    const mx = 111320 * Math.cos((r.a[1] * Math.PI) / 180);
    const dx = (r.b[0] - r.a[0]) * mx,
      dy = (r.b[1] - r.a[1]) * 111320;
    const px = (lng - r.a[0]) * mx,
      py = (lat - r.a[1]) * 111320;
    const t = (px * dx + py * dy) / (dx * dx + dy * dy);
    const clamped = Math.max(0, Math.min(1, t));
    const distance = Math.hypot(px - clamped * dx, py - clamped * dy);
    const blend = Math.max(0, Math.min(1, (distance - r.halfWidth) / 140));
    const w = 1 - blend * blend * (3 - 2 * blend);
    // Pick the closest corridor; adjacent RGIA runways share one longitudinal grade.
    if (w > weight) {
      weight = w;
      target = r.start + t * (r.end - r.start);
    }
  }
  return original + weight * (target - original);
}
export function tileLngLat(z: number, x: number, y: number): [number, number] {
  const n = 2 ** z;
  return [
    (x / n) * 360 - 180,
    (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI,
  ];
}
export function affectsRunway(z: number, x: number, y: number) {
  const [west, north] = tileLngLat(z, x, y),
    [east, south] = tileLngLat(z, x + 1, y + 1);
  return runways.some(
    (r) =>
      Math.max(r.a[0], r.b[0]) + 0.003 > west &&
      Math.min(r.a[0], r.b[0]) - 0.003 < east &&
      Math.max(r.a[1], r.b[1]) + 0.003 > south &&
      Math.min(r.a[1], r.b[1]) - 0.003 < north,
  );
}
export function correctTerrainPixels(
  pixels: Uint8ClampedArray,
  size: number,
  z: number,
  x: number,
  y: number,
) {
  for (let row = 0; row < size; row++)
    for (let col = 0; col < size; col++) {
      const i = (row * size + col) * 4;
      const original =
        pixels[i] * 256 + pixels[i + 1] + pixels[i + 2] / 256 - 32768;
      const [lng, lat] = tileLngLat(
        z,
        x + (col + 0.5) / size,
        y + (row + 0.5) / size,
      );
      const elevation = runwayElevation(lng, lat, original);
      if (elevation === original) continue;
      const packed = Math.max(
        0,
        Math.min(16777215, Math.round((elevation + 32768) * 256)),
      );
      pixels[i] = packed >> 16;
      pixels[i + 1] = (packed >> 8) & 255;
      pixels[i + 2] = packed & 255;
    }
}
