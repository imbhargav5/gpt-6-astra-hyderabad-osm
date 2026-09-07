import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map,
  type MapSourceDataEvent,
} from "maplibre-gl";
import type { FeatureCollection, Polygon, Position } from "geojson";
import { PlaceMesh, type V3, type Color } from "./place-mesh";
import type { Theme } from "./map-style";
export type FlyoverSettings = {
  visible: boolean;
  height: number;
  theme: Theme;
  terrainOn: boolean;
};
export const meshOrigin: [number, number] = [78.43, 17.4];
const origin = MercatorCoordinate.fromLngLat(meshOrigin),
  unit = origin.meterInMercatorCoordinateUnits();
const materials: Record<string, Color> = {
  deck: [0.59, 0.63, 0.59],
  surface: [0.38, 0.46, 0.45],
  barrier: [0.85, 0.86, 0.77],
  pier: [0.68, 0.71, 0.64],
  marking: [0.97, 0.95, 0.83],
};
export function createFlyoverMesh(
  data: FeatureCollection<Polygon>,
  height: number,
  elevation: (p: Position) => number | null,
  center: Position,
  radius = 4500,
) {
  const mesh = new PlaceMesh();
  for (const f of data.features) {
    const ring = f.geometry.coordinates[0].slice(0, -1);
    if (ring.length !== 4) continue;
    if (
      !ring.some(
        (p) =>
          Math.hypot((p[0] - center[0]) * 106100, (p[1] - center[1]) * 111320) <
          radius,
      )
    )
      continue;
    const grounds = ring.map(elevation);
    if (grounds.some((v) => v === null)) continue;
    const points = ring.map((p) => {
      const c = MercatorCoordinate.fromLngLat([p[0], p[1]]);
      return [(c.x - origin.x) / unit, (c.y - origin.y) / unit];
    });
    // Keep winding consistent after converting north-positive geographic coordinates to Mercator.
    const area = points.reduce(
      (sum, p, i) =>
        sum + p[0] * points[(i + 1) % 4][1] - points[(i + 1) % 4][0] * p[1],
      0,
    );
    const order = area > 0 ? [0, 1, 2, 3] : [3, 2, 1, 0];
    const top = order.map(
      (i) =>
        [
          points[i][0],
          points[i][1],
          grounds[i]! + f.properties!.top * Math.max(1, height),
        ] as V3,
    );
    const bottom = order.map(
      (i) =>
        [
          points[i][0],
          points[i][1],
          grounds[i]! + f.properties!.base * Math.max(1, height),
        ] as V3,
    );
    const color = materials[f.properties!.part] ?? materials.deck;
    mesh.quad(top[0], top[1], top[2], top[3], color);
    mesh.quad(bottom[3], bottom[2], bottom[1], bottom[0], color);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      mesh.quad(bottom[i], bottom[j], top[j], top[i], color);
    }
  }
  return mesh.finish();
}
interface State {
  data: FeatureCollection<Polygon>;
  settings: FlyoverSettings;
  dirty: boolean;
}
const states = new WeakMap<Map, State>();
export function updateFlyoverMesh(
  map: Map,
  data?: FeatureCollection<Polygon>,
  settings?: FlyoverSettings,
) {
  const state = states.get(map);
  if (!state) return;
  if (data) state.data = data;
  if (settings) state.settings = settings;
  state.dirty = true;
  map.triggerRepaint();
}
export function flyoverMeshLayer(
  data: FeatureCollection<Polygon>,
): CustomLayerInterface {
  let map: Map,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    buffer: WebGLBuffer,
    vao: WebGLVertexArrayObject,
    count = 0,
    lastBuild = 0;
  const state: State = {
    data,
    settings: { visible: true, height: 2, theme: "day", terrainOn: true },
    dirty: true,
  };
  const changed = () => {
    state.dirty = true;
    map.triggerRepaint();
  };
  const terrainChanged = (e: MapSourceDataEvent) => {
    if (e.sourceId === "terrain" && e.sourceDataType === "content") changed();
  };
  return {
    id: "flyover-3d",
    type: "custom",
    renderingMode: "3d",
    onAdd(m, context) {
      map = m;
      gl = context as WebGL2RenderingContext;
      states.set(map, state);
      const shader = (type: number, source: string) => {
        const s = gl.createShader(type)!;
        gl.shaderSource(s, source);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
          throw Error(gl.getShaderInfoLog(s) ?? "Flyover shader failed");
        return s;
      };
      const v = shader(
        gl.VERTEX_SHADER,
        `#version 300 es
  precision highp float;in vec3 a_pos;in vec3 a_normal;in vec3 a_color;uniform mat4 u_matrix;out vec3 v_normal;out vec3 v_color;void main(){gl_Position=u_matrix*vec4(a_pos,1.);v_normal=a_normal;v_color=a_color;}`,
      );
      const f = shader(
        gl.FRAGMENT_SHADER,
        `#version 300 es
  precision highp float;in vec3 v_normal;in vec3 v_color;uniform vec3 u_tint;out vec4 fragColor;void main(){float light=.48+.52*max(0.,dot(normalize(v_normal),normalize(vec3(-.6,.8,1.2))));fragColor=vec4(v_color*u_tint*light,1.);}`,
      );
      program = gl.createProgram()!;
      gl.attachShader(program, v);
      gl.attachShader(program, f);
      gl.linkProgram(program);
      gl.deleteShader(v);
      gl.deleteShader(f);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(program) ?? "Flyover link failed");
      buffer = gl.createBuffer()!;
      vao = gl.createVertexArray()!;
      const previous = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
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
      map.on("moveend", changed);
      map.on("sourcedata", terrainChanged);
    },
    render(_context, args) {
      if (!state.settings.visible || map.getZoom() < 12) return;
      if (state.dirty && Date.now() - lastBuild > 400) {
        state.dirty = false;
        lastBuild = Date.now();
        const cache = new globalThis.Map<string, number | null>();
        const elevation = (p: Position) => {
          if (!state.settings.terrainOn) return 0;
          const key = p.map((v) => v.toFixed(6)).join(",");
          if (!cache.has(key))
            cache.set(key, map.queryTerrainElevation([p[0], p[1]]));
          return cache.get(key)!;
        };
        const vertices = createFlyoverMesh(
          state.data,
          state.settings.height,
          elevation,
          map.getCenter().toArray(),
        );
        count = vertices.length / 9;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.DYNAMIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        map.getContainer().dataset.flyoverVertices = String(count);
      }
      const raw = args.defaultProjectionData.mainMatrix,
        matrix = new Float32Array(raw);
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
      gl.uniform3fv(
        gl.getUniformLocation(program, "u_tint"),
        state.settings.theme === "night"
          ? [0.58, 0.74, 0.73]
          : state.settings.theme === "sunset"
            ? [1, 0.89, 0.74]
            : [1, 1, 1],
      );
      const previous = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      gl.bindVertexArray(vao);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      gl.drawArrays(gl.TRIANGLES, 0, count);
      gl.bindVertexArray(previous);
      if (state.dirty) map.triggerRepaint();
    },
    onRemove() {
      map.off("moveend", changed);
      map.off("sourcedata", terrainChanged);
      states.delete(map);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      delete map.getContainer().dataset.flyoverVertices;
    },
  };
}
