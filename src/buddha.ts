import { lightDirection, hazeGLSL, applyAtmosphere } from "./environment";
import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map,
} from "maplibre-gl";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import type { Theme } from "./map-style";

// Center of the statue footprint in the live OSM tiles (the artwork POI is offset).
export const BUDDHA_CENTER: [number, number] = [78.475004, 17.415568];
type Vec = [number, number, number];
const normalize = (v: Vec): Vec => {
  const n = Math.hypot(...v) || 1;
  return v.map((x) => x / n) as Vec;
};
export function buddhaReplacementIds(
  buildings: Feature<Polygon | MultiPolygon>[],
) {
  return buildings
    .filter(
      (f) =>
        f.id !== undefined &&
        (f.geometry.type === "Polygon"
          ? [f.geometry.coordinates]
          : f.geometry.coordinates
        ).every((p) =>
          p.every(
            (r) =>
              r.length >= 4 &&
              r.every(
                (v) =>
                  Math.abs((v[0] - BUDDHA_CENTER[0]) * 106200) < 8 &&
                  Math.abs((v[1] - BUDDHA_CENTER[1]) * 111320) < 8,
              ),
          ),
        ),
    )
    .map((f) => f.id!);
}

/** Position, normal and stone tint, in meters. Illustrative sculpture, not a scan. */
export function buddhaMesh() {
  const vertices: number[] = [];
  const triangle = (a: Vec, b: Vec, c: Vec, tint: number, normals?: Vec[]) => {
    const u = b.map((v, i) => v - a[i]),
      v = c.map((v, i) => v - a[i]);
    const n = normalize([
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ]);
    [a, b, c].forEach((p, i) =>
      vertices.push(...p, ...(normals?.[i] ?? n), tint),
    );
  };
  const sphere = (
    center: Vec,
    scale: Vec,
    tint = 1,
    segments = 24,
    rows = 16,
  ) => {
    const point = (i: number, j: number): [Vec, Vec] => {
      const a = (i / segments) * Math.PI * 2,
        b = (j / rows) * Math.PI;
      const d = [
        Math.cos(a) * Math.sin(b),
        Math.sin(a) * Math.sin(b),
        Math.cos(b),
      ];
      return [
        d.map((v, k) => center[k] + v * scale[k]) as Vec,
        normalize(d.map((v, k) => v / scale[k]) as Vec),
      ];
    };
    for (let j = 0; j < rows; j++)
      for (let i = 0; i < segments; i++) {
        const a = point(i, j),
          b = point(i + 1, j),
          c = point(i + 1, j + 1),
          d = point(i, j + 1);
        triangle(a[0], c[0], b[0], tint, [a[1], c[1], b[1]]);
        triangle(a[0], d[0], c[0], tint, [a[1], d[1], c[1]]);
      }
  };
  const profile = (
    rings: [number, number, number][],
    tint: number,
    folds = false,
    segments = 64,
  ) => {
    const point = (r: number, i: number): Vec => {
      const [z, rx, ry] = rings[r],
        a = (i / segments) * Math.PI * 2;
      const pleat = folds
        ? 0.045 * Math.cos(a * 18 + z * 0.2) +
          0.022 * Math.sin(a * 11 - z * 0.45)
        : 0;
      return [(rx + pleat) * Math.cos(a), (ry + pleat) * Math.sin(a), z];
    };
    for (let r = 0; r < rings.length - 1; r++)
      for (let i = 0; i < segments; i++) {
        const a = point(r, i),
          b = point(r, i + 1),
          c = point(r + 1, i + 1),
          d = point(r + 1, i);
        triangle(a, b, c, tint);
        triangle(a, c, d, tint);
      }
    for (const r of [0, rings.length - 1])
      for (let i = 0; i < segments; i++)
        triangle([0, 0, rings[r][0]], point(r, i), point(r, i + 1), tint);
  };
  const tube = (points: Vec[], radius: number, tint = 1, sides = 10) => {
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k],
        b = points[k + 1],
        axis = normalize(b.map((v, i) => v - a[i]) as Vec);
      const u = normalize(
        Math.abs(axis[2]) < 0.9
          ? [-axis[1], axis[0], 0]
          : [0, -axis[2], axis[1]],
      );
      const v: Vec = [
        axis[1] * u[2] - axis[2] * u[1],
        axis[2] * u[0] - axis[0] * u[2],
        axis[0] * u[1] - axis[1] * u[0],
      ];
      const p = (c: Vec, i: number): Vec =>
        c.map(
          (n, j) =>
            n +
            radius *
              (u[j] * Math.cos((i / sides) * Math.PI * 2) +
                v[j] * Math.sin((i / sides) * Math.PI * 2)),
        ) as Vec;
      for (let i = 0; i < sides; i++) {
        triangle(p(a, i), p(a, i + 1), p(b, i + 1), tint);
        triangle(p(a, i), p(b, i + 1), p(b, i), tint);
      }
    }
  };
  // Stepped octagonal plinth and carved lotus rim.
  profile(
    [
      [0, 4.4, 4.4],
      [0.35, 4.4, 4.4],
      [0.35, 4.05, 4.05],
      [0.7, 4.05, 4.05],
      [0.7, 3.6, 3.6],
      [2.35, 3.6, 3.6],
      [2.35, 3.9, 3.9],
      [2.65, 3.9, 3.9],
      [2.65, 3.4, 3.4],
      [3.05, 3.1, 3.1],
      [3.2, 2.8, 2.8],
    ],
    0.78,
    false,
    8,
  );
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    sphere(
      [2.85 * Math.cos(a), 2.85 * Math.sin(a), 2.92],
      [0.36, 0.36, 0.34],
      0.95,
      12,
      8,
    );
  }
  sphere([-0.7, 0.45, 3.5], [0.52, 1.0, 0.32]);
  sphere([0.7, 0.45, 3.5], [0.52, 1.0, 0.32]);
  // Subtle fluting is part of the robe surface, not painted lines.
  profile(
    [
      [3.65, 1.42, 0.76],
      [4.4, 1.65, 0.87],
      [6, 1.78, 0.94],
      [8, 1.7, 0.92],
      [10, 1.56, 0.86],
      [12, 1.58, 0.84],
      [14, 1.95, 0.96],
      [15.6, 2.04, 0.94],
      [16.3, 1.7, 0.8],
      [16.7, 0.7, 0.56],
    ],
    1,
    true,
  );
  // Right hand raised in reassurance, left arm falling alongside the robe.
  tube(
    [
      [-1.65, 0, 15.65],
      [-2.25, 0.05, 14.2],
      [-2.65, 0.55, 13.5],
      [-2.6, 0.9, 15.8],
    ],
    0.47,
  );
  sphere([-2.6, 0.95, 16.1], [0.46, 0.25, 0.66]);
  for (let i = 0; i < 4; i++)
    tube(
      [
        [-2.94 + i * 0.21, 0.96, 16.2],
        [-2.96 + i * 0.21, 1, 17.1 - Math.abs(i - 1.5) * 0.12],
      ],
      0.105,
      1,
      8,
    );
  tube(
    [
      [-2.23, 0.96, 15.95],
      [-2.04, 1.02, 16.38],
    ],
    0.14,
  );
  tube(
    [
      [1.65, 0, 15.6],
      [2.14, 0.08, 13.2],
      [1.9, 0.42, 10.6],
    ],
    0.46,
  );
  sphere([1.88, 0.48, 10.4], [0.34, 0.27, 0.65]);
  // Draped, diagonal shoulder fold and nested curved robe folds.
  for (let row = 0; row < 8; row++) {
    const path: Vec[] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      path.push([
        -1.45 + 3 * t,
        0.87 + 0.1 * Math.sin(t * Math.PI),
        14.9 - row * 0.58 - 1.4 * Math.sin(t * Math.PI),
      ]);
    }
    tube(path, 0.045, 0.9, 6);
  }
  tube(
    [
      [1.1, 0.58, 16.1],
      [0.4, 0.88, 15.6],
      [-0.5, 0.98, 14.8],
      [-1.25, 0.81, 13.7],
      [-1.6, 0.63, 12.3],
    ],
    0.1,
    0.94,
  );
  sphere([0, 0, 17], [0.58, 0.54, 0.78]);
  sphere([0, 0.06, 18.55], [1.01, 0.83, 1.4]);
  // Elongated earlobes, eyelids, nose, quiet smile and the ushnisha.
  for (const x of [-1.03, 1.03]) {
    sphere([x, 0.02, 18.2], [0.22, 0.27, 0.65]);
    sphere([x, 0.22, 18.18], [0.09, 0.07, 0.32], 0.78, 12, 8);
  }
  sphere([0, 0.84, 18.4], [0.19, 0.27, 0.4]);
  sphere([0, 1, 18.13], [0.23, 0.15, 0.13]);
  for (const x of [-0.42, 0.42]) {
    tube(
      [
        [x - 0.23, 0.785, 18.67],
        [x, 0.875, 18.6],
        [x + 0.22, 0.79, 18.67],
      ],
      0.035,
      0.66,
      8,
    );
    tube(
      [
        [x - 0.24, 0.73, 18.93],
        [x, 0.81, 18.99],
        [x + 0.23, 0.75, 18.94],
      ],
      0.055,
      0.91,
      8,
    );
  }
  tube(
    [
      [-0.3, 0.78, 17.96],
      [0, 0.86, 17.9],
      [0.3, 0.78, 17.96],
    ],
    0.04,
    0.73,
    8,
  );
  sphere([0, 0.79, 19.13], [0.07, 0.055, 0.075], 0.93, 12, 8);
  sphere([0, -0.04, 19.65], [0.91, 0.8, 0.7], 0.86);
  sphere([0, -0.07, 20.32], [0.44, 0.41, 0.48], 0.87);
  // Small carved curls across the crown; no applied image texture or external model download.
  for (let row = 0; row < 5; row++)
    for (let i = 0; i < 18; i++) {
      const a = ((i + (row % 2) * 0.5) / 18) * Math.PI * 2,
        b = 0.3 + row * 0.22;
      sphere(
        [
          0.94 * Math.sin(b) * Math.cos(a),
          -0.04 + 0.82 * Math.sin(b) * Math.sin(a),
          19.55 + 0.72 * Math.cos(b),
        ],
        [0.115, 0.105, 0.1],
        0.86,
        8,
        6,
      );
    }
  return new Float32Array(vertices);
}

type Settings = {
  visible: boolean;
  height: number;
  terrainOn: boolean;
  theme: Theme;
};
export function buddhaLayer(settings: () => Settings): CustomLayerInterface {
  let map: Map,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    buffer: WebGLBuffer,
    vao: WebGLVertexArrayObject;
  let count = 0;
  return {
    id: "buddha-statue",
    type: "custom",
    renderingMode: "3d",
    onAdd(m, context) {
      map = m;
      gl = context as WebGL2RenderingContext;
      const compile = (type: number, source: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw new Error(gl.getShaderInfoLog(s) ?? "Statue shader failed");
        return s;
      };
      const vertex = compile(
        gl.VERTEX_SHADER,
        `#version 300 es
        precision highp float;
        in vec3 a_position;in vec3 a_normal;in float a_tint;
        uniform mat4 u_matrix;uniform float u_scale;uniform float u_ground;
        out vec3 v_normal;out float v_tint;out float v_depth;
        void main(){vec3 p=a_position*u_scale;p.z+=u_ground;gl_Position=u_matrix*vec4(p,1.);v_normal=a_normal;v_tint=a_tint;v_depth=gl_Position.w;}`,
      );
      const fragment = compile(
        gl.FRAGMENT_SHADER,
        `#version 300 es
        precision highp float;
        in vec3 v_normal;in float v_tint;in float v_depth;uniform vec3 u_color;uniform vec3 u_light;out vec4 fragColor;
        ${hazeGLSL}
        void main(){float diffuse=max(0.,dot(normalize(v_normal),normalize(u_light)));float shade=.58+.42*diffuse;fragColor=vec4(atmosphere(u_color*shade*v_tint,v_depth),1.);}`,
      );
      program = gl.createProgram()!;
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(
          gl.getProgramInfoLog(program) ?? "Statue shader linking failed",
        );
      buffer = gl.createBuffer()!;
      vao = gl.createVertexArray()!;
      const previous = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      const mesh = buddhaMesh();
      count = mesh.length / 7;
      gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
      for (const [name, size, offset] of [
        ["a_position", 3, 0],
        ["a_normal", 3, 12],
        ["a_tint", 1, 24],
      ] as const) {
        const loc = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 28, offset);
      }
      gl.bindVertexArray(previous);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      map.getContainer().dataset.buddhaTriangles = String(count / 3);
    },
    render(_context, args) {
      const s = settings();
      if (!s.visible || map.getZoom() < 13) return;
      const ground = s.terrainOn ? map.queryTerrainElevation(BUDDHA_CENTER) : 0;
      if (ground === null) return; // Wait for the island DEM instead of drawing at sea level.
      const origin = MercatorCoordinate.fromLngLat(BUDDHA_CENTER),
        unit = origin.meterInMercatorCoordinateUnits();
      const raw = args.defaultProjectionData.mainMatrix,
        matrix = new Float32Array(raw);
      // Local meters keep facial geometry precise at close zoom.
      for (let i = 0; i < 4; i++) {
        matrix[12 + i] =
          raw[12 + i] + raw[i] * origin.x + raw[4 + i] * origin.y;
        matrix[i] = raw[i] * unit;
        matrix[4 + i] = raw[4 + i] * unit;
        matrix[8 + i] = raw[8 + i] * unit;
      }
      gl.useProgram(program);
      gl.uniformMatrix4fv(
        gl.getUniformLocation(program, "u_matrix"),
        false,
        matrix,
      );
      gl.uniform1f(gl.getUniformLocation(program, "u_scale"), s.height);
      gl.uniform1f(gl.getUniformLocation(program, "u_ground"), ground);
      gl.uniform3fv(
        gl.getUniformLocation(program, "u_color"),
        s.theme === "night"
          ? [0.72, 0.8, 0.77]
          : s.theme === "sunset"
            ? [1, 0.88, 0.7]
            : [0.92, 0.91, 0.84],
      );
      gl.uniform3fv(
        gl.getUniformLocation(program, "u_light"),
        lightDirection(s.theme),
      );
      applyAtmosphere(gl, program, s.theme, args.farZ);
      const previous = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      gl.bindVertexArray(vao);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);
      gl.drawArrays(gl.TRIANGLES, 0, count);
      gl.bindVertexArray(previous);
    },
    onRemove() {
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      delete map.getContainer().dataset.buddhaTriangles;
    },
  };
}
