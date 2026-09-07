import type { GeoJSONSource, Map as AtlasMap } from "maplibre-gl";
import type { FeatureCollection, Point } from "geojson";

type Position = [number, number];
export function makeRoute(points: Position[]) {
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    distances.push(
      distances[i - 1] +
        Math.hypot(
          (b[0] - a[0]) * 111320 * Math.cos((a[1] * Math.PI) / 180),
          (b[1] - a[1]) * 111320,
        ),
    );
  }
  return { points, distances, length: distances.at(-1) ?? 0 };
}
export function sampleRoute(
  route: ReturnType<typeof makeRoute>,
  distance: number,
) {
  const d = Math.max(0, Math.min(route.length, distance));
  let i = 1;
  while (i < route.points.length - 1 && route.distances[i] <= d) i++;
  const a = route.points[i - 1],
    b = route.points[i];
  const t =
    (d - route.distances[i - 1]) /
    (route.distances[i] - route.distances[i - 1] || 1);
  return {
    coordinates: [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
    ] as Position,
    bearing:
      (Math.atan2(
        (b[0] - a[0]) * Math.cos((a[1] * Math.PI) / 180),
        b[1] - a[1],
      ) *
        180) /
      Math.PI,
  };
}

/** Small, illustrative vehicles follow loaded OSM roads and airport runways. */
export function installTraffic(map: AtlasMap, enabled: () => boolean) {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let routes: (ReturnType<typeof makeRoute> & {
    plane: boolean;
    phase: number;
  })[] = [];
  let elapsed = 0,
    previous = 0,
    lastDraw = 0,
    frame = 0;
  const empty: FeatureCollection<Point> = {
    type: "FeatureCollection",
    features: [],
  };
  let visible = false;
  function install() {
    for (const plane of [false, true]) {
      const id = plane ? "traffic-plane" : "traffic-car";
      if (map.hasImage(id)) continue;
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 48;
      const c = canvas.getContext("2d")!;
      c.fillStyle = plane ? "#fff9e9" : "#557f7a";
      c.strokeStyle = "#315652";
      c.lineWidth = 1.5;
      if (plane) {
        c.beginPath();
        [
          [24, 3],
          [27, 7],
          [28, 20],
          [43, 29],
          [43, 33],
          [28, 29],
          [27, 39],
          [33, 43],
          [33, 45],
          [24, 42],
          [15, 45],
          [15, 43],
          [21, 39],
          [20, 29],
          [5, 33],
          [5, 29],
          [20, 20],
          [21, 7],
        ].forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
        c.closePath();
        c.fill();
        c.stroke();
      } else {
        c.beginPath();
        c.roundRect(16, 7, 16, 34, 5);
        c.fill();
        c.stroke();
        c.fillStyle = "#dcebea";
        c.fillRect(18, 13, 12, 7);
        c.fillStyle = "#fff1c8";
        c.fillRect(17, 8, 4, 3);
        c.fillRect(27, 8, 4, 3);
      }
      map.addImage(id, c.getImageData(0, 0, 48, 48), { pixelRatio: 2 });
    }
    if (!map.getSource("ambient-traffic"))
      map.addSource("ambient-traffic", { type: "geojson", data: empty });
    if (!map.getLayer("ambient-traffic"))
      map.addLayer(
        {
          id: "ambient-traffic",
          type: "symbol",
          source: "ambient-traffic",
          minzoom: 11,
          layout: {
            "icon-image": [
              "case",
              ["get", "plane"],
              "traffic-plane",
              "traffic-car",
            ],
            "icon-size": [
              "interpolate",
              ["linear"],
              ["zoom"],
              11,
              ["case", ["get", "plane"], 0.65, 0.18],
              16,
              ["case", ["get", "plane"], 1.15, 0.45],
              19,
              0.9,
            ],
            "icon-rotate": ["get", "bearing"],
            "icon-rotation-alignment": "map",
            "icon-pitch-alignment": "map",
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
          },
          paint: {
            "icon-opacity": ["get", "opacity"],
            "icon-opacity-transition": { duration: 0 },
          },
        },
        "water-labels",
      );
    refresh();
  }
  function refresh() {
    if (!map.getLayer("roads") || !map.getLayer("runways")) return;
    const seen = new Set<string>();
    const candidates = map.queryRenderedFeatures({
      layers: ["runways", "highways", "roads"],
    });
    routes = [];
    let cars = 0,
      planes = 0;
    for (const f of candidates) {
      const plane = f.layer.id === "runways";
      if (
        plane
          ? f.properties.class !== "runway" || planes >= 4
          : ![
              "motorway",
              "trunk",
              "primary",
              "secondary",
              "tertiary",
              "minor",
            ].includes(f.properties.class) ||
            cars >= 85 ||
            Number(f.properties.layer) < 0 ||
            ["tunnel", "bridge"].includes(f.properties.brunnel)
      )
        continue;
      const lines =
        f.geometry.type === "LineString"
          ? [f.geometry.coordinates]
          : f.geometry.type === "MultiLineString"
            ? f.geometry.coordinates
            : [];
      for (const line of lines) {
        const points = line.map((p) => [p[0], p[1]] as Position);
        const key = JSON.stringify(points);
        if (seen.has(key)) continue;
        seen.add(key);
        const route = makeRoute(points);
        if (points.length < 2 || route.length < (plane ? 500 : 100)) continue;
        let hash = 0;
        for (const char of key)
          hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
        routes.push({ ...route, plane, phase: (hash % 1000) / 1000 });
        if (plane) planes++;
        else cars++;
        break;
      }
    }
  }
  function tick(now: number) {
    frame = requestAnimationFrame(tick);
    const active =
      enabled() && !motion.matches && !document.hidden && map.getZoom() >= 11;
    if (active && previous) elapsed += Math.min(now - previous, 100);
    previous = now;
    if (now - lastDraw < 50) return;
    lastDraw = now;
    const source = map.getSource("ambient-traffic") as
      GeoJSONSource | undefined;
    if (!source) return;
    if (!active) {
      if (visible) source.setData(empty);
      visible = false;
      return;
    }
    visible = true;
    source.setData({
      type: "FeatureCollection",
      features: routes.map((route) => {
        const progress =
          (route.phase +
            ((elapsed / 1000) * (route.plane ? 32 : 6)) / route.length) %
          1;
        const sample = sampleRoute(route, progress * route.length);
        return {
          type: "Feature",
          geometry: { type: "Point", coordinates: sample.coordinates },
          properties: {
            plane: route.plane,
            bearing: sample.bearing,
            opacity: Math.min(1, progress * 12, (1 - progress) * 12) * 0.85,
          },
        };
      }),
    });
  }
  map.on("style.load", install);
  map.on("moveend", refresh);
  const sourceLoaded = (e: { sourceId?: string; isSourceLoaded?: boolean }) => {
    if (e.sourceId === "osm" && e.isSourceLoaded) refresh();
  };
  map.on("sourcedata", sourceLoaded);
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    map.off("style.load", install);
    map.off("moveend", refresh);
    map.off("sourcedata", sourceLoaded);
  };
}
