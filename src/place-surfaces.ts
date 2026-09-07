import { campusSurfaceDetails } from "./campus-surfaces";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import type { Map } from "maplibre-gl";
import footprints from "./data/landmark-footprints.json";
import type { Theme } from "./map-style";

export function insideSite(p: Position, ring: Position[]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i],
      b = ring[j];
    if (
      a[1] > p[1] !== b[1] > p[1] &&
      p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export function createSiteDetails(): FeatureCollection {
  const features: Feature[] = campusSurfaceDetails();
  const add = (site: string, kind: string, geometry: Geometry) =>
    features.push({ type: "Feature", properties: { site, kind }, geometry });
  const line = (site: string, kind: string, coordinates: Position[]) =>
    add(site, kind, { type: "LineString", coordinates });
  const polygon = (site: string, kind: string, ring: Position[]) =>
    add(site, kind, { type: "Polygon", coordinates: [ring] });
  for (const key of ["zoo", "parade", "gymkhana", "jail"] as const) {
    const site = footprints[key],
      ring = site.coordinates;
    if (key === "parade") polygon(key, "earth", ring);
    line(key, "edge", ring);
    for (const path of site.paths)
      for (let i = 1; i < path.length; i++) {
        const a = path[i - 1],
          b = path[i];
        if (insideSite(a, ring) && insideSite(b, ring))
          line(key, "path", [a, b]);
      }
    // Low perimeter masonry follows the published site boundary, without invented security facilities.
    for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1],
        b = ring[i],
        dx = (b[0] - a[0]) * 106100,
        dy = (b[1] - a[1]) * 111320,
        len = Math.hypot(dx, dy);
      if (!len) continue;
      const ox = ((-dy / len) * 0.45) / 106100,
        oy = ((dx / len) * 0.45) / 111320;
      polygon(key, key === "jail" ? "wall" : "curb", [
        [a[0] + ox, a[1] + oy],
        [b[0] + ox, b[1] + oy],
        [b[0] - ox, b[1] - oy],
        [a[0] - ox, a[1] - oy],
        [a[0] + ox, a[1] + oy],
      ]);
    }
    for (const area of site.areas) {
      if (!("sport" in area.tags)) continue;
      const r = area.coordinates;
      const center = r
        .slice(0, -1)
        .reduce(
          (p, a) => [
            p[0] + a[0] / (r.length - 1),
            p[1] + a[1] / (r.length - 1),
          ],
          [0, 0],
        );
      if (!insideSite(center, ring)) continue;
      polygon(key, "turf", r);
      line(
        key,
        "mark",
        r.map((p) => [
          center[0] + (p[0] - center[0]) * 0.95,
          center[1] + (p[1] - center[1]) * 0.95,
        ]),
      );
      if (area.tags.sport === "cricket") {
        // Alternating mowing bands clipped to the surveyed field, not the surrounding lawns.
        const minY = Math.min(...r.map((p) => p[1])),
          maxY = Math.max(...r.map((p) => p[1]));
        for (let y = minY; y < maxY; y += 10 / 111320) {
          const crossings: number[] = [];
          for (let i = 1; i < r.length; i++) {
            const a = r[i - 1],
              b = r[i];
            if (a[1] > y !== b[1] > y)
              crossings.push(
                a[0] + ((b[0] - a[0]) * (y - a[1])) / (b[1] - a[1]),
              );
          }
          crossings.sort((a, b) => a - b);
          for (let i = 0; i + 1 < crossings.length; i += 2)
            line(key, "mow", [
              [crossings[i], y],
              [crossings[i + 1], y],
            ]);
        }
        const [x, y] = center;
        const point = (dx: number, dy: number) => [
          x + dx / 106100,
          y + dy / 111320,
        ];
        polygon(key, "pitch", [
          point(-1.5, -10.06),
          point(1.5, -10.06),
          point(1.5, 10.06),
          point(-1.5, 10.06),
          point(-1.5, -10.06),
        ]);
        for (const end of [-1, 1])
          for (const offset of [8.84, 10.06])
            line(key, "mark", [
              point(-2.64, end * offset),
              point(2.64, end * offset),
            ]);
      } else if (r.length === 5) {
        const mid = (a: Position, b: Position) => [
          (a[0] + b[0]) / 2,
          (a[1] + b[1]) / 2,
        ];
        line(key, "mark", [mid(r[0], r[1]), mid(r[2], r[3])]);
        if (area.tags.sport === "tennis")
          for (const t of [0.23, 0.77])
            line(key, "mark", [
              [
                r[0][0] + (r[3][0] - r[0][0]) * t,
                r[0][1] + (r[3][1] - r[0][1]) * t,
              ],
              [
                r[1][0] + (r[2][0] - r[1][0]) * t,
                r[1][1] + (r[2][1] - r[1][1]) * t,
              ],
            ]);
      }
    }
  }
  return { type: "FeatureCollection", features };
}
export function installSiteDetails(map: Map) {
  if (map.getSource("place-surfaces")) return;
  map.addSource("place-surfaces", {
    type: "geojson",
    data: createSiteDetails(),
    tolerance: 0,
  });
  map.addLayer(
    {
      id: "site-surfaces",
      type: "fill",
      source: "place-surfaces",
      minzoom: 13,
      filter: [
        "in",
        ["get", "kind"],
        ["literal", ["earth", "turf", "pitch", "park", "runway", "apron"]],
      ],
      paint: {
        "fill-color": [
          "match",
          ["get", "kind"],
          "earth",
          "#c5c3a2",
          "park",
          "#acbc8a",
          "runway",
          "#778483",
          "apron",
          "#b3b5a8",
          "pitch",
          "#c9bc91",
          "#95ac77",
        ],
      },
    },
    "water-labels",
  );
  for (const [id, kinds, width, color] of [
    ["site-mowing", ["mow"], 5, "#aec18e"],
    ["site-path-casing", ["path"], 5, "#a5a991"],
    ["site-lines", ["path", "edge", "mark"], 1.5, "#f0edda"],
  ] as const) {
    map.addLayer(
      {
        id,
        type: "line",
        source: "place-surfaces",
        minzoom: 14,
        filter: ["in", ["get", "kind"], ["literal", [...kinds]]],
        paint: { "line-color": color, "line-width": width },
      },
      "water-labels",
    );
  }
  map.addLayer(
    {
      id: "campus-taxiways",
      type: "line",
      source: "place-surfaces",
      minzoom: 13,
      filter: ["==", ["get", "kind"], "taxiway"],
      paint: { "line-color": "#a9ada4", "line-width": 5 },
    },
    "water-labels",
  );
  map.addLayer(
    {
      id: "campus-runway-markings",
      type: "line",
      source: "place-surfaces",
      minzoom: 14,
      filter: ["==", ["get", "kind"], "runway-mark"],
      paint: {
        "line-color": "#f3f1df",
        "line-width": 2,
        "line-dasharray": [8, 6],
      },
    },
    "water-labels",
  );
  map.addLayer(
    {
      id: "site-walls",
      type: "fill-extrusion",
      source: "place-surfaces",
      minzoom: 14,
      filter: ["in", ["get", "kind"], ["literal", ["wall", "curb"]]],
      paint: {
        "fill-extrusion-color": "#bbb49c",
        "fill-extrusion-height": ["match", ["get", "kind"], "wall", 4, 0.35],
        "fill-extrusion-vertical-gradient": true,
      },
    },
    "water-labels",
  );
}
export function applySiteSettings(
  map: Map,
  s: {
    theme: Theme;
    height: number;
    parks: boolean;
    buildings: boolean;
    roads: boolean;
  },
) {
  for (const id of [
    "campus-taxiways",
    "campus-runway-markings",
    "site-surfaces",
    "site-mowing",
    "site-path-casing",
    "site-lines",
    "site-walls",
  ])
    if (map.getLayer(id)) {
      map.setLayoutProperty(
        id,
        "visibility",
        (
          id.startsWith("campus-")
            ? s.roads
            : id === "site-surfaces"
              ? s.parks || s.roads
              : id === "site-walls"
                ? s.buildings || s.parks
                : s.parks
        )
          ? "visible"
          : "none",
      );
    }
  if (map.getLayer("site-walls"))
    map.setPaintProperty("site-walls", "fill-extrusion-height", [
      "*",
      ["match", ["get", "kind"], "wall", 4, 0.35],
      s.height,
    ]);
  if (map.getLayer("site-walls"))
    map.setFilter("site-walls", [
      "in",
      ["get", "kind"],
      [
        "literal",
        [...(s.buildings ? ["wall"] : []), ...(s.parks ? ["curb"] : [])],
      ],
    ]);
  if (map.getLayer("site-surfaces"))
    map.setFilter("site-surfaces", [
      "in",
      ["get", "kind"],
      [
        "literal",
        [
          ...(s.parks ? ["earth", "turf", "pitch", "park"] : []),
          ...(s.roads ? ["runway", "apron"] : []),
        ],
      ],
    ]);
  if (map.getLayer("site-surfaces"))
    map.setPaintProperty(
      "site-surfaces",
      "fill-opacity",
      s.theme === "night" ? 0.55 : 1,
    );
}
