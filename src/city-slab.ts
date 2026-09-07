import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map,
} from "maplibre-gl";

/** Presentation crop, not an administrative boundary. All curated places fit inside. */
export const CITY_BOUNDS: [number, number, number, number] = [
  78.23, 17.2, 78.63, 17.56,
];
export type ClipPoint = [number, number, number, number];

/** Clip before perspective division, including when the city edge is behind the camera. */
export function clipToViewport(polygon: ClipPoint[]): ClipPoint[] {
  const planes = [
    (p: ClipPoint) => p[3] - 1e-8,
    (p: ClipPoint) => p[0] + p[3],
    (p: ClipPoint) => p[3] - p[0],
    (p: ClipPoint) => p[1] + p[3],
    (p: ClipPoint) => p[3] - p[1],
    (p: ClipPoint) => p[2] + p[3],
  ];
  for (const distance of planes) {
    const output: ClipPoint[] = [];
    for (let i = 0; i < polygon.length; i++) {
      const a = polygon[i],
        b = polygon[(i + 1) % polygon.length];
      const da = distance(a),
        db = distance(b);
      if (da >= 0) output.push(a);
      if (da >= 0 !== db >= 0) {
        const t = da / (da - db);
        output.push(a.map((v, j) => v + (b[j] - v) * t) as ClipPoint);
      }
    }
    polygon = output;
  }
  return polygon;
}

/** Matched rounded rings in metres keep the bevel uniform across all four corners. */
export function roundedPerimeter(
  inset: number,
  radius: number,
): [number, number][] {
  const [west, south, east, north] = CITY_BOUNDS;
  const latUnit = 1 / 111320;
  const lngUnit = latUnit / Math.cos((((north + south) / 2) * Math.PI) / 180);
  const rx = radius * lngUnit,
    ry = radius * latUnit;
  const w = west + inset * lngUnit,
    e = east - inset * lngUnit;
  const n = north - inset * latUnit,
    bottom = south + inset * latUnit;
  const centers = [
    [e - rx, n - ry],
    [e - rx, bottom + ry],
    [w + rx, bottom + ry],
    [w + rx, n - ry],
  ];
  const ring: [number, number][] = [];
  for (let side = 0; side < 4; side++) {
    const start = Math.PI / 2 - (side * Math.PI) / 2;
    for (let step = 0; step <= 10; step++) {
      const angle = start - (step * Math.PI) / 20;
      ring.push([
        centers[side][0] + rx * Math.cos(angle),
        centers[side][1] + ry * Math.sin(angle),
      ]);
    }
    const a = ring[ring.length - 1];
    const next = (side + 1) % 4,
      angle = start - Math.PI / 2;
    const b = [
      centers[next][0] + rx * Math.cos(angle),
      centers[next][1] + ry * Math.sin(angle),
    ];
    for (let step = 1; step < 16; step++)
      ring.push([
        a[0] + ((b[0] - a[0]) * step) / 16,
        a[1] + ((b[1] - a[1]) * step) / 16,
      ]);
  }
  return ring;
}

export function citySlab(): CustomLayerInterface {
  let map: Map;
  let svg: SVGSVGElement;
  let shadow: SVGPolygonElement;
  let base: SVGPolygonElement;
  let bands: SVGPolygonElement[][];
  const ns = "http://www.w3.org/2000/svg";
  const inner = roundedPerimeter(300, 1000);
  const outer = roundedPerimeter(0, 1300);
  const foot = roundedPerimeter(140, 1160);
  const count = inner.length;
  return {
    id: "city-slab",
    type: "custom",
    renderingMode: "3d",
    onAdd(m) {
      map = m;
      svg = document.createElementNS(ns, "svg");
      svg.classList.add("city-slab-base");
      svg.setAttribute("aria-hidden", "true");
      const polygon = (className: string) => {
        const p = document.createElementNS(ns, "polygon");
        p.setAttribute("class", className);
        svg.append(p);
        return p;
      };
      shadow = polygon("slab-shadow");
      base = polygon("slab-bottom");
      // Paint the lower chamfer, satin sidewall, then the narrow upper bevel.
      bands = ["slab-foot", "slab-side", "slab-bevel"].map((className) =>
        inner.map((_, i) => {
          const p = polygon(className);
          const a = outer[i],
            b = outer[(i + 1) % count];
          const dx = (b[0] - a[0]) * Math.cos((17.38 * Math.PI) / 180),
            dy = b[1] - a[1];
          const length = Math.hypot(dx, dy);
          const light = ((-dy / length) * -0.6 + (dx / length) * 0.8 + 1) / 2;
          p.style.setProperty(
            "--edge-light",
            `${(18 + light * 48).toFixed(1)}%`,
          );
          return p;
        }),
      );
      map.getContainer().prepend(svg);
      map.getContainer().classList.add("bounded-map");
    },
    render(_gl, args) {
      map.getContainer().classList.toggle("city-overview", map.getZoom() < 11);
      const matrix = args.defaultProjectionData.mainMatrix;
      const width = map.getCanvas().clientWidth,
        height = map.getCanvas().clientHeight;
      const terrainOn = Boolean(map.getTerrain());
      const floor = terrainOn ? -100 : -350;
      const project = (
        point: [number, number],
        elevation: number,
      ): ClipPoint => {
        const p = MercatorCoordinate.fromLngLat(point, elevation);
        return [0, 1, 2, 3].map(
          (i) =>
            matrix[i] * p.x +
            matrix[4 + i] * p.y +
            matrix[8 + i] * p.z +
            matrix[12 + i],
        ) as ClipPoint;
      };
      const toPixels = (points: ClipPoint[]) =>
        clipToViewport(points).map((p) => [
          ((p[0] / p[3] + 1) * width) / 2,
          ((1 - p[1] / p[3]) * height) / 2,
        ]);
      const draw = (polygon: SVGPolygonElement, points: ClipPoint[]) =>
        polygon.setAttribute(
          "points",
          toPixels(points)
            .map((p) => p.map((v) => v.toFixed(2)).join(","))
            .join(" "),
        );
      const elevations = inner.map(
        (point) => map.queryTerrainElevation(point) ?? 0,
      );
      const top = inner.map((point, i) => project(point, elevations[i]));
      const shoulder = outer.map((point, i) =>
        project(point, elevations[i] - 80),
      );
      const lower = outer.map((point) => project(point, floor + 120));
      const bottom = foot.map((point) => project(point, floor));
      const outline = toPixels(top);
      map.getCanvas().style.clipPath = outline.length
        ? `polygon(${outline.map((p) => `${p[0].toFixed(2)}px ${p[1].toFixed(2)}px`).join(",")})`
        : "polygon(0 0,0 0,0 0)";
      svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
      draw(shadow, bottom);
      draw(base, bottom);
      const rings = [
        [bottom, lower],
        [lower, shoulder],
        [shoulder, top],
      ];
      rings.forEach(([a, b], band) => {
        for (let i = 0; i < count; i++) {
          const next = (i + 1) % count;
          draw(bands[band][i], [a[i], a[next], b[next], b[i]]);
        }
      });
    },
    onRemove() {
      map.getCanvas().style.clipPath = "";
      map.getContainer().classList.remove("bounded-map", "city-overview");
      svg.remove();
    },
  };
}
