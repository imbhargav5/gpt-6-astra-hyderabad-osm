import {
  environment,
  lightDirection,
  hazeGLSL,
  applyAtmosphere,
} from "./environment";
import { GeometryWorker } from "./geometry-worker-client";
import { ResourceCache, streamBounds } from "./spatial-stream";
import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map,
  type MapSourceDataEvent,
} from "maplibre-gl";
import type { FeatureCollection, Polygon } from "geojson";
import type { Theme } from "./map-style";
export type FlyoverSettings = {
  visible: boolean;
  height: number;
  theme: Theme;
  terrainOn: boolean;
};
import { meshOrigin } from "./flyover-geometry";
export { createFlyoverMesh, meshOrigin } from "./flyover-geometry";
const origin = MercatorCoordinate.fromLngLat(meshOrigin),
  unit = origin.meterInMercatorCoordinateUnits();
interface State {
  data: FeatureCollection<Polygon>;
  settings: FlyoverSettings;
  refresh: () => void;
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
  state.refresh();
}
export function flyoverMeshLayer(
  data: FeatureCollection<Polygon>,
): CustomLayerInterface {
  let map: Map,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    vao: WebGLVertexArrayObject;
  const state: State = {
    data,
    settings: { visible: true, height: 2, theme: "day", terrainOn: true },
    refresh: () => changed(),
  };
  let worker: GeometryWorker;
  let removed = false,
    running = false,
    revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let active = new Set<string>();
  const cache = new ResourceCache<{
    buffer: WebGLBuffer;
    count: number;
    signature: string;
  }>(32 * 1024 * 1024, (entry) => gl.deleteBuffer(entry.buffer));
  const rebuild = async () => {
    timer = undefined;
    if (removed || map.isMoving() || running) return;
    const current = revision;
    running = true;
    try {
      if (!state.settings.visible || map.getZoom() < 12) {
        active.clear();
        cache.trim(active);
        return;
      }
      const bounds = streamBounds(map.getBounds());
      const chunks = new globalThis.Map<string, FeatureCollection<Polygon>>();
      for (const feature of state.data.features) {
        const ring = feature.geometry.coordinates[0];
        const west = Math.min(...ring.map((p) => p[0])),
          east = Math.max(...ring.map((p) => p[0]));
        const south = Math.min(...ring.map((p) => p[1])),
          north = Math.max(...ring.map((p) => p[1]));
        const x = Math.floor((west + east) * 50),
          y = Math.floor((south + north) * 50);
        // Select whole cells so slight camera changes reuse exactly the same geometry.
        if (
          (x + 1) / 100 < bounds[0] ||
          x / 100 > bounds[2] ||
          (y + 1) / 100 < bounds[1] ||
          y / 100 > bounds[3]
        )
          continue;
        const key = `${x}:${y}`;
        if (!chunks.has(key))
          chunks.set(key, { type: "FeatureCollection", features: [] });
        chunks.get(key)!.features.push(feature);
      }
      active = new Set(chunks.keys());
      for (const [key, data] of chunks) {
        if (removed || revision !== current) return;
        const elevations = new globalThis.Map<string, number | null>();
        let sampled = 0;
        for (const f of data.features)
          for (const p of f.geometry.coordinates[0]) {
            const id = p.join(",");
            if (!elevations.has(id))
              elevations.set(
                id,
                state.settings.terrainOn
                  ? map.queryTerrainElevation([p[0], p[1]])
                  : 0,
              );
            if (++sampled % 500 === 0) {
              await new Promise((resolve) => setTimeout(resolve, 0));
              if (removed || revision !== current) return;
            }
          }
        const signature = JSON.stringify([
          state.settings.height,
          data,
          [...elevations],
        ]);
        if (cache.get(key)?.signature === signature) continue;
        try {
          const mesh = await worker.run<Float32Array>({
            kind: "flyover",
            data,
            height: state.settings.height,
            elevations: [...elevations],
            center: map.getCenter().toArray(),
          });
          if (removed || revision !== current) return;
          const buffer = gl.createBuffer()!;
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ARRAY_BUFFER, null);
          cache.set(
            key,
            { buffer, count: mesh.length / 9, signature },
            mesh.byteLength + signature.length * 2,
            active,
          );
          map.triggerRepaint();
        } catch (error) {
          if (!removed) console.error("Flyover geometry failed", error);
          return;
        }
      }
      cache.trim(active);
      map.getContainer().dataset.flyoverVertices = String(
        [...active].reduce((n, key) => n + (cache.get(key)?.count ?? 0), 0),
      );
      map.getContainer().dataset.flyoverChunks = String(active.size);
    } finally {
      running = false;
      if (!removed && current !== revision && !timer)
        timer = setTimeout(() => {
          void rebuild();
        }, 160);
    }
  };
  const changed = () => {
    revision++;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      void rebuild();
    }, 160);
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
  precision highp float;in vec3 a_pos;in vec3 a_normal;in vec3 a_color;uniform mat4 u_matrix;out vec3 v_normal;out vec3 v_color;out float v_depth;void main(){gl_Position=u_matrix*vec4(a_pos,1.);v_normal=a_normal;v_color=a_color;v_depth=gl_Position.w;}`,
      );
      const f = shader(
        gl.FRAGMENT_SHADER,
        `#version 300 es
  precision highp float;in vec3 v_normal;in vec3 v_color;in float v_depth;uniform vec3 u_tint;uniform vec3 u_light;out vec4 fragColor;
  ${hazeGLSL}
  void main(){float light=.6+.4*max(0.,dot(normalize(v_normal),normalize(u_light)));fragColor=vec4(atmosphere(v_color*u_tint*light,v_depth),1.);}`,
      );
      program = gl.createProgram()!;
      gl.attachShader(program, v);
      gl.attachShader(program, f);
      gl.linkProgram(program);
      gl.deleteShader(v);
      gl.deleteShader(f);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw Error(gl.getProgramInfoLog(program) ?? "Flyover link failed");
      vao = gl.createVertexArray()!;
      worker = new GeometryWorker();
      changed();
      map.on("movestart", changed);
      map.on("moveend", changed);
      map.on("sourcedata", terrainChanged);
    },
    render(_context, args) {
      if (!state.settings.visible || map.getZoom() < 12) return;
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
        environment[state.settings.theme].tint,
      );
      gl.uniform3fv(
        gl.getUniformLocation(program, "u_light"),
        lightDirection(state.settings.theme),
      );
      applyAtmosphere(gl, program, state.settings.theme, args.farZ);
      const previous = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      gl.bindVertexArray(vao);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.depthMask(true);
      gl.disable(gl.CULL_FACE);
      gl.disable(gl.BLEND);
      for (const key of active) {
        const entry = cache.get(key);
        if (!entry) continue;
        gl.bindBuffer(gl.ARRAY_BUFFER, entry.buffer);
        for (const [name, offset] of [
          ["a_pos", 0],
          ["a_normal", 12],
          ["a_color", 24],
        ] as const) {
          const loc = gl.getAttribLocation(program, name);
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 36, offset);
        }
        gl.drawArrays(gl.TRIANGLES, 0, entry.count);
      }
      gl.bindVertexArray(previous);
    },
    onRemove() {
      map.off("movestart", changed);
      map.off("moveend", changed);
      map.off("sourcedata", terrainChanged);
      states.delete(map);
      removed = true;
      revision++;
      if (timer) clearTimeout(timer);
      worker.dispose();
      cache.clear();
      delete map.getContainer().dataset.flyoverChunks;
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      delete map.getContainer().dataset.flyoverVertices;
    },
  };
}
