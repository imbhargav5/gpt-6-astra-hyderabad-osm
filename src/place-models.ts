import {
  LngLat,
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map,
} from "maplibre-gl";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import {
  PlaceMesh,
  type V3,
  marble,
  stone,
  sandstone,
  shadow,
  gold,
  glass,
} from "./place-mesh";
import type { Theme } from "./map-style";
export interface PlaceModel {
  id: string;
  center: [number, number];
  angle: number;
  replace: [number, number];
  mesh: Float32Array;
}

export function createPlaceModels(): PlaceModel[] {
  const models: PlaceModel[] = [];
  const add = (
    id: string,
    center: [number, number],
    replace: [number, number],
    build: (m: PlaceMesh) => void,
    angle = 0,
  ) => {
    const m = new PlaceMesh();
    build(m);
    models.push({ id, center, replace, angle, mesh: m.finish() });
  };
  add("birla-mandir", [78.46926, 17.4057], [32, 38], (m) => {
    m.box(-27, -32, 0, 54, 64, 1, stone);
    m.hall(32, 40, 7, marble, 1);
    m.shikhara(0, -10, 7, 6.2, 21, marble);
    m.dome(0, 12, 7, 7, 6, marble);
    for (const x of [-21, 21])
      for (const y of [-24, 24]) {
        m.box(x - 3, y - 3, 1, 6, 6, 4, marble);
        m.shikhara(x, y, 5, 3.3, 7, marble);
      }
    for (let i = 0; i < 8; i++)
      m.box(-6, 21 + i * 1.2, 0, 12, 1.2, (8 - i) * 0.22, marble);
    for (let x = -13; x < 16; x += 4) m.portal(x, 21, 1, 3.5, 5, marble);
    for (const side of [-1, 1])
      for (let y = -29; y < 29; y += 3) {
        m.box(side * 26 - 0.15, y, 0.9, 0.3, 0.3, 1, marble);
        m.beam([side * 26, y, 1.9], [side * 26, y + 3, 1.9], 0.12, marble);
      }
  });
  add("birla-planetarium", [78.470717, 17.403323], [27, 17], (m) => {
    m.hall(44, 24, 5, [0.72, 0.75, 0.71], 1);
    m.lathe(
      0,
      0,
      [
        [5, 11.8],
        [6, 11.8],
        [6.4, 11.2],
      ],
      marble,
    );
    m.dome(0, 0, 6.4, 11.2, 8.5, marble);
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      m.beam(
        [11.8 * Math.cos(a), 11.8 * Math.sin(a), 1],
        [11.8 * Math.cos(a), 11.8 * Math.sin(a), 5],
        0.13,
        stone,
      );
    }
    m.box(-8, 12, 0, 16, 6, 0.6, stone);
    m.portal(0, 15, 0.6, 9, 4, marble);
    for (let x = -18; x <= 18; x += 3)
      m.box(x - 0.7, -12.15, 2.4, 1.4, 0.3, 1.4, glass);
  });
  add("chilkur-balaji", [78.298839, 17.358776], [25, 33], (m) => {
    m.box(-21, -28, 0, 42, 56, 0.6, stone);
    m.hall(27, 33, 5, marble, 1);
    // Layered gateway tower: projecting cornices and repeated small niches.
    m.portal(0, 22, 0.6, 9, 7, marble);
    for (let i = 0; i < 7; i++) {
      const w = 13 - i * 1.2,
        z = 7 + i * 1.5;
      m.box(-w / 2, 18, z, w, 6 - i * 0.45, 1.25, marble);
      m.box(-w / 2 - 0.4, 17.7, z + 1.25, w + 0.8, 6.6 - i * 0.45, 0.25, stone);
      for (let x = -w / 2 + 1; x < w / 2; x += 1.5)
        m.box(x - 0.25, 24.05 - i * 0.45, z + 0.3, 0.5, 0.2, 0.65, shadow);
    }
    m.shikhara(0, -10, 5, 4, 9, marble);
    for (let y = -22; y < 18; y += 4)
      for (const x of [-17, 17]) {
        m.beam([x, y, 0.6], [x, y, 4], 0.35, marble);
        m.box(x - 2, y - 2, 4, 4, 4, 0.35, marble);
      }
  });
  add("jagannath-temple", [78.425925, 17.415005], [24, 32], (m) => {
    m.box(-21, -29, 0, 42, 58, 1.3, sandstone);
    m.hall(22, 30, 8, sandstone, 1);
    m.shikhara(0, -8, 8, 6.4, 22, sandstone);
    for (let i = 0; i < 8; i++) {
      const r = 8 - i * 0.8;
      m.lathe(
        0,
        12,
        [
          [8 + i * 0.85, r],
          [8 + (i + 1) * 0.85, r - 0.65],
        ],
        sandstone,
        4,
      );
    }
    for (const x of [-16, 16]) {
      m.box(x - 3, -13, 1.3, 6, 6, 4, sandstone);
      m.shikhara(x, -10, 5.3, 3.2, 10, sandstone);
    }
    for (let z = 2; z < 8; z += 1.1)
      for (let x = -10; x <= 10; x += 1.25)
        m.box(x - 0.22, 15.08, z, 0.44, 0.22, 0.5, stone);
    for (let i = 0; i < 8; i++)
      m.box(-7, 16 + i * 1.25, 0, 14, 1.25, (8 - i) * 0.2, sandstone);
  });
  add("secunderabad-gurdwara", [78.500577, 17.436064], [15, 19], (m) => {
    m.hall(23, 29, 11, marble, 3);
    m.dome(0, 0, 11, 6.4, 7, gold, true);
    for (const x of [-9, 9])
      for (const y of [-12, 12]) {
        m.lathe(
          x,
          y,
          [
            [11, 1.7],
            [13, 1.7],
          ],
          marble,
          16,
        );
        m.dome(x, y, 13, 2, 2.8, gold, true);
      }
    m.portal(0, 15, 0, 6, 6, marble);
    m.beam([13, 12, 0], [13, 12, 23], 0.12, gold);
    m.triangle(
      [13, 12, 22.9],
      [16, 12, 21.8],
      [13, 12, 21.2],
      [0.91, 0.53, 0.18],
    );
  });
  add("secunderabad-clock-tower", [78.498554, 17.440903], [7, 7], (m) => {
    m.box(-5, -5, 0, 10, 10, 1.2, stone);
    m.box(-3.3, -3.3, 1.2, 6.6, 6.6, 24, [0.5, 0.47, 0.39]);
    for (let z = 2; z < 24; z += 1.25) {
      m.box(-3.35, -3.35, z, 6.7, 6.7, 0.08, stone);
      for (const side of [-1, 1])
        for (let x = -2.5; x < 3; x += 1.7)
          m.box(x, side * 3.34 - 0.035, z, 0.065, 0.07, 1.2, stone);
    }
    m.box(-4, -4, 24, 8, 8, 1, marble);
    m.box(-3.6, -3.6, 25, 7.2, 7.2, 5.7, marble);
    m.box(-4.1, -4.1, 30.7, 8.2, 8.2, 0.7, stone);
    for (let face = 0; face < 4; face++) {
      const a = (face * Math.PI) / 2,
        rotate = (x: number, y: number, z: number): V3 => [
          x * Math.cos(a) - y * Math.sin(a),
          x * Math.sin(a) + y * Math.cos(a),
          z,
        ];
      const center = rotate(0, 3.67, 27.8);
      for (let i = 0; i < 48; i++) {
        const p = (i / 48) * 2 * Math.PI,
          q = ((i + 1) / 48) * 2 * Math.PI;
        m.triangle(
          center,
          rotate(1.65 * Math.cos(p), 3.67, 27.8 + 1.65 * Math.sin(p)),
          rotate(1.65 * Math.cos(q), 3.67, 27.8 + 1.65 * Math.sin(q)),
          [0.98, 0.97, 0.9],
        );
        m.beam(
          rotate(1.7 * Math.cos(p), 3.7, 27.8 + 1.7 * Math.sin(p)),
          rotate(1.7 * Math.cos(q), 3.7, 27.8 + 1.7 * Math.sin(q)),
          0.07,
          shadow,
          6,
        );
      }
      for (let i = 0; i < 12; i++) {
        const p = (i / 12) * 2 * Math.PI;
        m.beam(
          rotate(1.27 * Math.sin(p), 3.73, 27.8 + 1.27 * Math.cos(p)),
          rotate(1.49 * Math.sin(p), 3.73, 27.8 + 1.49 * Math.cos(p)),
          0.045,
          shadow,
          6,
        );
      }
      m.beam(rotate(0, 3.76, 27.8), rotate(-0.8, 3.76, 28.25), 0.065, shadow);
      m.beam(rotate(0, 3.77, 27.8), rotate(0.95, 3.77, 28.4), 0.045, shadow);
    }
    for (const x of [-2, 2])
      for (const y of [-2, 2]) m.beam([x, y, 31.4], [x, y, 34], 0.28, marble);
    m.dome(0, 0, 34, 3.2, 2.1, [0.45, 0.5, 0.45]);
  });
  add(
    "durgam-bridge",
    [78.3898818, 17.4316856],
    [0, 0],
    (m) => {
      m.box(-201, -13, 6, 402, 26, 1.5, [0.55, 0.61, 0.6]);
      m.box(-201, -10.5, 7.5, 402, 21, 0.12, [0.32, 0.4, 0.41]);
      for (const y of [-12.2, 12.2]) {
        m.beam([-201, y, 9], [201, y, 9], 0.16, marble);
        for (let x = -200; x < 202; x += 5)
          m.beam([x, y, 7.5], [x, y, 9], 0.09, marble);
      }
      for (const y of [-7, -3.5, 3.5, 7])
        for (let x = -196; x < 194; x += 9)
          m.box(x, y, 7.64, 4, 0.12, 0.025, marble);
      for (const x of [-116.5, 116.5]) {
        m.box(x - 2, -2, 0, 4, 4, 29, marble);
        m.box(x - 3, -3, 28, 6, 6, 1.2, stone);
        for (const direction of [-1, 1])
          for (let i = 1; i <= 13; i++)
            for (const side of [-1, 1])
              m.beam(
                [x, side * 1.6, 28 - i * 0.18],
                [x + direction * i * 6.2, side * 11, 7.8],
                0.12,
                [0.77, 0.86, 0.85],
                6,
              );
      }
      for (let x = -185; x < 190; x += 25)
        for (const side of [-1, 1]) {
          m.beam([x, side * 12, 7.5], [x, side * 12, 12], 0.085, shadow);
          m.beam([x, side * 12, 12], [x, side * 10.5, 12], 0.085, shadow);
        }
    },
    -14,
  );
  // Entrance location is approximate; the surrounding paths and boundary use mapped geometry.
  add(
    "nehru-zoo",
    [78.45296, 17.35322],
    [0, 0],
    (m) => {
      for (const x of [-13, 0, 13])
        m.portal(x, 0, 0, 10, 7, [0.69, 0.63, 0.46]);
      m.box(-20, -1, 9, 40, 2, 1.7, [0.28, 0.43, 0.33]);
      for (const x of [-23, 20]) {
        m.box(x, -4, 0, 3, 8, 5, stone);
        m.box(x - 0.7, -4.7, 5, 4.4, 9.4, 0.6, [0.29, 0.43, 0.34]);
      }
      for (let x = -18; x < 20; x += 2)
        m.beam([x, 0, 0], [x, 0, 4.5], 0.055, shadow);
    },
    90,
  );
  return models;
}
export const PLACE_MODELS = createPlaceModels();
export function placeReplacementIds(
  buildings: Feature<Polygon | MultiPolygon>[],
  models: PlaceModel[],
) {
  return buildings
    .filter(
      (f) =>
        f.id !== undefined &&
        models.some(
          (m) =>
            m.replace[0] > 0 &&
            (f.geometry.type === "Polygon"
              ? [f.geometry.coordinates]
              : f.geometry.coordinates
            ).every((poly) =>
              poly.every(
                (r) =>
                  r.length >= 4 &&
                  r.every(
                    (p) =>
                      Math.abs((p[0] - m.center[0]) * 106100) < m.replace[0] &&
                      Math.abs((p[1] - m.center[1]) * 111320) < m.replace[1],
                  ),
              ),
            ),
        ),
    )
    .map((f) => f.id!);
}

export function placeModelsLayer(
  settings: () => {
    height: number;
    theme: Theme;
    visible: boolean;
    terrainOn: boolean;
  },
): CustomLayerInterface {
  let gl: WebGL2RenderingContext,
    map: Map,
    program: WebGLProgram,
    buffer: WebGLBuffer,
    vao: WebGLVertexArrayObject;
  const models = PLACE_MODELS;
  const ranges: { model: PlaceModel; start: number; count: number }[] = [];
  return {
    id: "detailed-place-models",
    type: "custom",
    renderingMode: "3d",
    onAdd(m, context) {
      map = m;
      gl = context as WebGL2RenderingContext;
      const shader = (type: number, source: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw Error(gl.getShaderInfoLog(s) ?? "Place model shader failed");
        return s;
      };
      const v = shader(
        gl.VERTEX_SHADER,
        `#version 300 es
      precision highp float;in vec3 a_pos;in vec3 a_normal;in vec3 a_color;uniform mat4 u_matrix;uniform float u_height;uniform float u_ground;out vec3 v_normal;out vec3 v_color;
      void main(){vec3 p=a_pos;p.z=p.z*u_height+u_ground;gl_Position=u_matrix*vec4(p,1.);v_normal=normalize(vec3(a_normal.xy,a_normal.z/u_height));v_color=a_color;}`,
      );
      const f = shader(
        gl.FRAGMENT_SHADER,
        `#version 300 es
      precision highp float;in vec3 v_normal;in vec3 v_color;uniform vec3 u_tint;uniform vec3 u_light;out vec4 fragColor;void main(){float diffuse=max(0.,dot(normalize(v_normal),normalize(u_light)));fragColor=vec4(v_color*u_tint*(.57+.43*diffuse),1.);}`,
      );
      program = gl.createProgram()!;
      gl.attachShader(program, v);
      gl.attachShader(program, f);
      gl.linkProgram(program);
      gl.deleteShader(v);
      gl.deleteShader(f);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(program) ?? "Place model link failed");
      const total = models.reduce((n, m) => n + m.mesh.length, 0),
        data = new Float32Array(total);
      let offset = 0;
      for (const model of models) {
        ranges.push({ model, start: offset / 9, count: model.mesh.length / 9 });
        data.set(model.mesh, offset);
        offset += model.mesh.length;
      }
      buffer = gl.createBuffer()!;
      vao = gl.createVertexArray()!;
      const previous = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      for (const [name, offset] of [
        ["a_pos", 0],
        ["a_normal", 12],
        ["a_color", 24],
      ] as const) {
        const loc = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 36, offset);
      }
      gl.bindVertexArray(previous);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      map.getContainer().dataset.detailedModels = models
        .map((m) => m.id)
        .join(",");
    },
    render(_context, args) {
      const s = settings();
      if (!s.visible || map.getZoom() < 13) return;
      gl.useProgram(program);
      gl.uniform1f(gl.getUniformLocation(program, "u_height"), s.height);
      gl.uniform3fv(
        gl.getUniformLocation(program, "u_tint"),
        s.theme === "night"
          ? [0.64, 0.79, 0.78]
          : s.theme === "sunset"
            ? [1, 0.9, 0.78]
            : [1, 1, 1],
      );
      gl.uniform3fv(
        gl.getUniformLocation(program, "u_light"),
        s.theme === "sunset" ? [-1, 0.5, 0.8] : [-0.6, 0.8, 1.2],
      );
      const previous = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      gl.bindVertexArray(vao);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);
      for (const { model, start, count } of ranges) {
        if (map.getCenter().distanceTo(LngLat.convert(model.center)) > 5000)
          continue;
        const ground = s.terrainOn
          ? map.queryTerrainElevation(model.center)
          : 0;
        if (ground === null) continue;
        const origin = MercatorCoordinate.fromLngLat(model.center),
          unit = origin.meterInMercatorCoordinateUnits(),
          raw = args.defaultProjectionData.mainMatrix,
          matrix = new Float32Array(raw),
          a = (model.angle * Math.PI) / 180;
        for (let i = 0; i < 4; i++) {
          matrix[12 + i] =
            raw[12 + i] + raw[i] * origin.x + raw[4 + i] * origin.y;
          matrix[i] = (raw[i] * Math.cos(a) + raw[4 + i] * Math.sin(a)) * unit;
          matrix[4 + i] =
            (-raw[i] * Math.sin(a) + raw[4 + i] * Math.cos(a)) * unit;
          matrix[8 + i] = raw[8 + i] * unit;
        }
        gl.uniformMatrix4fv(
          gl.getUniformLocation(program, "u_matrix"),
          false,
          matrix,
        );
        gl.uniform1f(gl.getUniformLocation(program, "u_ground"), ground);
        gl.drawArrays(gl.TRIANGLES, start, count);
      }
      gl.bindVertexArray(previous);
    },
    onRemove() {
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      delete map.getContainer().dataset.detailedModels;
    },
  };
}
