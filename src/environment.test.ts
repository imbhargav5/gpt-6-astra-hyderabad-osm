import { describe, expect, it } from "vitest";
import { createExpression } from "@maplibre/maplibre-gl-style-spec";
import { environment, lightDirection } from "./environment";
import { buildingMaterial, createStyle } from "./map-style";
import { canopyTriangles } from "./forest-geometry";
import { readMapSettings } from "./map-settings";

describe("environment rendering", () => {
  it("uses the same world-fixed light direction for rotated custom models", () => {
    for (const theme of ["day", "sunset", "night"] as const) {
      expect(createStyle(theme, 1.5).light?.anchor).toBe("map");
      const expected = lightDirection(theme);
      expect(Math.hypot(...expected)).toBeCloseTo(1);
      for (const angle of [0, 37, 90, 180]) {
        const [x, y, z] = lightDirection(theme, angle);
        const a = (angle * Math.PI) / 180;
        expect(x * Math.cos(a) - y * Math.sin(a)).toBeCloseTo(expected[0]);
        expect(x * Math.sin(a) + y * Math.cos(a)).toBeCloseTo(expected[1]);
        expect(z).toBeCloseTo(expected[2]);
      }
      expect(createStyle(theme, 1.5).light?.position).toEqual([
        1.5,
        environment[theme].azimuth,
        environment[theme].polar,
      ]);
    }
  });
  it("keeps building materials stable across zooms, with attribute and missing-ID fallbacks", () => {
    for (const theme of ["day", "sunset", "night"] as const) {
      const compiled = createExpression(buildingMaterial(theme));
      if (compiled.result !== "success")
        throw Error(JSON.stringify(compiled.value));
      const feature = {
        type: 3 as const,
        id: 17,
        properties: { render_height: 20 },
      };
      expect(compiled.value.evaluate({ zoom: 14 }, feature)).toEqual(
        compiled.value.evaluate({ zoom: 18 }, feature),
      );
      const colors = new Set(
        Array.from({ length: 5 }, (_, id) =>
          compiled.value.evaluate({ zoom: 16 }, { ...feature, id }),
        ),
      );
      expect(colors.size).toBeGreaterThan(2);
      expect(
        compiled.value.evaluate({ zoom: 16 }, { type: 3, properties: {} }),
      ).toBeTruthy();
      expect(
        compiled.value.evaluate(
          { zoom: 16 },
          { ...feature, properties: { material: "brick" } },
        ),
      ).not.toEqual(
        compiled.value.evaluate(
          { zoom: 16 },
          { ...feature, properties: { render_height: 90 } },
        ),
      );
    }
  });
  it("produces bounded, non-degenerate canopies without exceeding the existing tree triangle budget", () => {
    for (const seed of [0, 0.25, 0.5, 0.99]) {
      const mesh = canopyTriangles(12, 5, 2, seed);
      expect(mesh).toEqual(canopyTriangles(12, 5, 2, seed));
      expect(mesh.length / 3 + 4 + 8).toBe(24); // canopy + trunk + contact shadow
      for (const [x, y, z] of mesh) {
        expect(Math.hypot(x, y)).toBeLessThanOrEqual(5.3);
        expect(z).toBeGreaterThanOrEqual(2);
        expect(z).toBeLessThanOrEqual(12);
      }
      for (let i = 0; i < mesh.length; i += 3) {
        const [a, b, c] = mesh.slice(i, i + 3);
        const u = b.map((v, j) => v - a[j]),
          v = c.map((n, j) => n - a[j]);
        expect(
          Math.hypot(
            u[1] * v[2] - u[2] * v[1],
            u[2] * v[0] - u[0] * v[2],
            u[0] * v[1] - u[1] * v[0],
          ),
        ).toBeGreaterThan(0);
      }
    }
  });
  it("uses gentler new defaults while preserving previously saved exaggeration", () => {
    const fresh = readMapSettings({ getItem: () => null });
    expect([fresh.height, fresh.terrain]).toEqual([1.5, 1.5]);
    const existing = readMapSettings({
      getItem: () => JSON.stringify({ height: 2, terrain: 2.5 }),
    });
    expect([existing.height, existing.terrain]).toEqual([2, 2.5]);
  });
});
