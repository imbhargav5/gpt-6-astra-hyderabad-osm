import type { Feature, Position } from "geojson";
import footprints from "./data/campus-footprints.json";
// Ray casting shared in this module to keep surface generation independent of map lifecycle.
export function inCampus(p: Position, r: Position[]) {
  let yes = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i],
      b = r[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      yes = !yes;
  }
  return yes;
}
export function campusSurfaceDetails(): Feature[] {
  const features: Feature[] = [];
  const add = (
    site: string,
    kind: string,
    coordinates: Position[],
    polygon = false,
  ) =>
    features.push({
      type: "Feature",
      properties: { site, kind },
      geometry: polygon
        ? { type: "Polygon", coordinates: [coordinates] }
        : { type: "LineString", coordinates },
    });
  for (const [site, data] of Object.entries(footprints)) {
    const boundary = data.boundary;
    if (!boundary.length) continue;
    if (site === "biodiversity-park") add(site, "park", boundary, true);
    if (
      [
        "biodiversity-park",
        "begumpet-airport",
        "hakimpet",
        "tcs-adibatla",
      ].includes(site)
    )
      add(site, "edge", boundary);
    for (const s of data.surfaces) {
      const r = s.coordinates;
      if (r.length < 2) continue;
      if (!r.some((p) => inCampus(p, boundary))) continue;
      const closed =
        r.length > 3 && r[0][0] === r.at(-1)![0] && r[0][1] === r.at(-1)![1];
      if (s.kind === "runway" || s.kind === "apron") {
        if (closed) add(site, s.kind, r, true);
        else if (s.kind === "runway") {
          for (let i = 1; i < r.length; i++) {
            const a = r[i - 1],
              b = r[i],
              dx = (b[0] - a[0]) * 106100,
              dy = (b[1] - a[1]) * 111320,
              len = Math.hypot(dx, dy);
            if (!len) continue;
            const ox = ((-dy / len) * 22.5) / 106100,
              oy = ((dx / len) * 22.5) / 111320;
            add(
              site,
              "runway",
              [
                [a[0] + ox, a[1] + oy],
                [b[0] + ox, b[1] + oy],
                [b[0] - ox, b[1] - oy],
                [a[0] - ox, a[1] - oy],
                [a[0] + ox, a[1] + oy],
              ],
              true,
            );
          }
        } else add(site, "taxiway", r);
        if (s.kind === "runway") {
          // Estimate the long axis from the mapped polygon; markings are illustrative.
          const center = r
            .slice(0, closed ? -1 : undefined)
            .reduce(
              (a, p, _, all) => [
                a[0] + p[0] / all.length,
                a[1] + p[1] / all.length,
              ],
              [0, 0],
            );
          let a = r[0],
            b = r[1],
            dist = 0;
          for (const p of r)
            for (const q of r) {
              const d =
                ((p[0] - q[0]) * 106100) ** 2 + ((p[1] - q[1]) * 111320) ** 2;
              if (d > dist) {
                dist = d;
                a = p;
                b = q;
              }
            }
          const dx = (b[0] - a[0]) * 0.43,
            dy = (b[1] - a[1]) * 0.43;
          add(site, "runway-mark", [
            [center[0] - dx, center[1] - dy],
            [center[0] + dx, center[1] + dy],
          ]);
        }
      } else
        for (let i = 1; i < r.length; i++)
          if (inCampus(r[i - 1], boundary) && inCampus(r[i], boundary))
            add(site, s.kind === "taxiway" ? "taxiway" : "path", [
              r[i - 1],
              r[i],
            ]);
    }
  }
  return features;
}
export const campusBoundaries = footprints;
