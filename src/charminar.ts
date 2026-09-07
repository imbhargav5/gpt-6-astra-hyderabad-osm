import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
} from "geojson";

// Aligned to the mapped monument footprint. Dimensions and ornament are illustrative.
const center = [78.47464, 17.361603];
const angle = (-12 * Math.PI) / 180;
function ll(x: number, y: number) {
  return [
    center[0] +
      (x * Math.cos(angle) - y * Math.sin(angle)) /
        (111320 * Math.cos((center[1] * Math.PI) / 180)),
    center[1] + (x * Math.sin(angle) + y * Math.cos(angle)) / 111320,
  ];
}
function rectangle(x: number, y: number, w: number, d: number) {
  return [ll(x, y), ll(x + w, y), ll(x + w, y + d), ll(x, y + d), ll(x, y)];
}
/** MapLibre's within expression excludes polygon features, so match footprint vertices here. */
export function charminarReplacementIds(
  buildings: Feature<Polygon | MultiPolygon>[],
) {
  return buildings
    .filter(
      (f) =>
        f.id !== undefined &&
        (f.geometry.type === "Polygon"
          ? [f.geometry.coordinates]
          : f.geometry.coordinates
        ).every((polygon) =>
          polygon.every(
            (ring) =>
              ring.length >= 4 &&
              ring.every((p) => {
                const x =
                  (p[0] - center[0]) *
                  111320 *
                  Math.cos((center[1] * Math.PI) / 180);
                const y = (p[1] - center[1]) * 111320;
                return (
                  Math.abs(x * Math.cos(angle) + y * Math.sin(angle)) < 16 &&
                  Math.abs(-x * Math.sin(angle) + y * Math.cos(angle)) < 16
                );
              }),
          ),
        ),
    )
    .map((f) => f.id!);
}

export function charminarModel(): FeatureCollection<
  Polygon,
  {
    base: number;
    top: number;
    material: "stone" | "trim" | "recess" | "metal";
    fine: number;
    site: string;
  }
> {
  const data: ReturnType<typeof charminarModel> = {
    type: "FeatureCollection",
    features: [],
  };
  const add = (
    coordinates: number[][][],
    base: number,
    top: number,
    material: "stone" | "trim" | "recess" | "metal",
    fine = 0,
  ) =>
    data.features.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates },
      properties: { base, top, material, fine, site: "charminar" },
    });
  const box = (
    x: number,
    y: number,
    w: number,
    d: number,
    base: number,
    top: number,
    material: "stone" | "trim" = "stone",
    fine = 0,
  ) => add([rectangle(x, y, w, d)], base, top, material, fine);
  const circle = (x: number, y: number, radius: number) =>
    Array.from({ length: 33 }, (_, i) =>
      ll(
        x + radius * Math.cos((i * Math.PI) / 16),
        y + radius * Math.sin((i * Math.PI) / 16),
      ),
    );
  const drum = (
    x: number,
    y: number,
    radius: number,
    base: number,
    top: number,
    material: "stone" | "trim" | "metal" = "stone",
  ) => add([circle(x, y, radius)], base, top, material);
  const terrace = (size: number, hole: number, base: number, top: number) =>
    add(
      [
        rectangle(-size, -size, size * 2, size * 2),
        rectangle(-hole, -hole, hole * 2, hole * 2).reverse(),
      ],
      base,
      top,
      "trim",
    );
  // Four substantial piers leave real, open passages through both axes.
  for (const x of [-12, 6]) for (const y of [-12, 6]) box(x, y, 6, 6, 0, 19);
  // Pointed arches are constructed as narrow masonry wedges above the opening.
  for (const side of [-1, 1])
    for (let i = 0; i < 40; i++) {
      const x = -6 + i * 0.3;
      const arch = 6 + 7 * (1 - Math.pow(Math.abs(x + 0.15) / 6, 1.45));
      box(x, side === 1 ? 9.5 : -12, 0.301, 2.5, arch, 18.4);
      box(side === 1 ? 9.5 : -12, x, 2.5, 0.301, arch, 18.4);
    }
  terrace(12.5, 5.5, 18.4, 19.1);
  // The upper gallery is an open arcade, not a solid extruded block.
  for (const side of [-1, 1]) {
    const edge = side === 1 ? 10.5 : -12;
    for (let i = 0; i < 7; i++) {
      const x = -10.5 + i * 3.5;
      box(x - 0.3, edge, 0.6, 1.5, 19.1, 24.5, "trim");
      box(edge, x - 0.3, 1.5, 0.6, 19.1, 24.5, "trim");
    }
    for (let i = 0; i < 6; i++)
      for (let j = 0; j < 8; j++) {
        const x = -10.2 + i * 3.5 + (j * 2.9) / 8;
        const t = (j + 0.5) / 8;
        const base = 22 + 1.5 * Math.sqrt(Math.max(0, 1 - (2 * t - 1) ** 2));
        box(x, edge, 2.9 / 8 + 0.01, 1.5, base, 24.5, "trim");
        box(edge, x, 1.5, 2.9 / 8 + 0.01, base, 24.5, "trim");
      }
    box(-12, edge, 24, 1.5, 24.5, 26.5);
    box(edge, -12, 1.5, 24, 24.5, 26.5);
  }
  terrace(12.6, 8, 26.5, 27.2);
  for (const side of [-1, 1])
    for (let i = 0; i < 17; i++) {
      const x = -11.5 + i * 1.44;
      box(x, side * 12 - 0.16, 0.28, 0.32, 27.2, 28, "trim", 1);
      box(side * 12 - 0.16, x, 0.32, 0.28, 27.2, 28, "trim", 1);
    }
  // Four tiered minarets, projecting balcony rings, domed crowns and finials.
  for (const x of [-11.4, 11.4])
    for (const y of [-11.4, 11.4]) {
      drum(x, y, 2.4, 0, 19);
      drum(x, y, 1.9, 19, 40.2);
      for (const z of [19, 27.2, 33.8, 39.3]) {
        drum(x, y, 2.5, z, z + 0.45, "trim");
        drum(x, y, 2.2, z + 0.45, z + 1.05, "trim");
      }
      drum(x, y, 1.65, 40.2, 43.2, "trim");
      for (let band = 0; band < 16; band++) {
        const t = band / 16;
        const radius = 2.05 * Math.sqrt(1 - t * t);
        drum(x, y, radius, 43.2 + t * 3.4, 43.2 + (t + 1 / 16) * 3.4, "trim");
      }
      drum(x, y, 0.22, 46.6, 48.7, "metal");
    }
  return data;
}
