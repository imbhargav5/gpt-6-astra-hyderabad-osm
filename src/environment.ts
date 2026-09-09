import type { Theme } from "./map-style";

/** One world-fixed light rig for the base map and custom geometry. */
export const environment = {
  day: {
    azimuth: 225,
    polar: 48,
    color: "#fff1d9",
    intensity: 0.48,
    tint: [1, 0.98, 0.93],
    fog: "#dce7e5",
  },
  sunset: {
    azimuth: 255,
    polar: 68,
    color: "#ffd4a3",
    intensity: 0.52,
    tint: [1, 0.87, 0.72],
    fog: "#e7cabc",
  },
  night: {
    azimuth: 225,
    polar: 42,
    color: "#b7cddd",
    intensity: 0.3,
    tint: [0.66, 0.78, 0.84],
    fog: "#172832",
  },
} as const;

export function rgb(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
}

export function lightDirection(
  theme: Theme,
  rotation = 0,
): [number, number, number] {
  const { azimuth, polar } = environment[theme];
  // Match MapLibre's sphericalToCartesian convention, then undo model rotation.
  const a = ((azimuth + 90) * Math.PI) / 180,
    p = (polar * Math.PI) / 180;
  const x = Math.cos(a) * Math.sin(p),
    y = Math.sin(a) * Math.sin(p);
  const r = (rotation * Math.PI) / 180;
  return [
    x * Math.cos(r) + y * Math.sin(r),
    -x * Math.sin(r) + y * Math.cos(r),
    Math.cos(p),
  ];
}

/** Cheap distance haze, shared by all custom layers (no extra render pass). */
export const hazeGLSL = `uniform vec3 u_fog; uniform vec2 u_fogRange;
vec3 atmosphere(vec3 color, float depth) {
  return mix(color, u_fog, smoothstep(u_fogRange.x, u_fogRange.y, depth) * .38);
}`;
export function applyAtmosphere(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  theme: Theme,
  farZ: number,
) {
  gl.uniform3fv(
    gl.getUniformLocation(program, "u_fog"),
    rgb(environment[theme].fog),
  );
  gl.uniform2f(
    gl.getUniformLocation(program, "u_fogRange"),
    farZ * 0.18,
    farZ * 0.9,
  );
}
