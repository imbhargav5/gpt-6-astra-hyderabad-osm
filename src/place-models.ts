import { PLACE_MODELS } from "./place-geometry";
import type { PlaceModel } from "./place-geometry";
export { PLACE_MODELS, createPlaceModels } from "./place-geometry";
import { GeometryWorker } from "./geometry-worker-client";
import { inStreamBounds, streamBounds, ResourceCache } from "./spatial-stream";
import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map,
} from "maplibre-gl";
import type { Feature, Polygon, MultiPolygon } from "geojson";
import type { Theme } from "./map-style";
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
    vao: WebGLVertexArrayObject;
  const models = PLACE_MODELS;
  let worker: GeometryWorker;
  let removed = false;
  const pending = new Set<string>();
  const cache = new ResourceCache<{ buffer: WebGLBuffer; count: number }>(
    24 * 1024 * 1024,
    (entry) => gl.deleteBuffer(entry.buffer),
  );
  let active = new Set<string>();
  const refresh = () => {
    if (removed) return;
    const bounds = streamBounds(map.getBounds());
    active = new Set(
      settings().visible && map.getZoom() >= 13
        ? models
            .filter((m) => inStreamBounds(m.center, bounds))
            .map((m) => m.id)
        : [],
    );
    map.getContainer().dataset.activeModels = [...active].join(",");
    for (const model of models) {
      if (!active.has(model.id)) continue;
      if (cache.get(model.id) || pending.has(model.id)) continue;
      pending.add(model.id);
      worker
        .run<Float32Array>({ kind: "place", id: model.id })
        .then((mesh) => {
          pending.delete(model.id);
          if (removed || !active.has(model.id)) return;
          const buffer = gl.createBuffer()!;
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
          gl.bindBuffer(gl.ARRAY_BUFFER, null);
          cache.set(
            model.id,
            { buffer, count: mesh.length / 9 },
            mesh.byteLength,
            active,
          );
          map.getContainer().dataset.detailedModels = [...cache.keys()].join(
            ",",
          );
          map.getContainer().dataset.modelCacheBytes = String(cache.bytes);
          map.triggerRepaint();
        })
        .catch((error) => {
          pending.delete(model.id);
          if (!removed) console.error("Place geometry failed", error);
        });
    }
    cache.trim(active);
  };
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
      vao = gl.createVertexArray()!;
      worker = new GeometryWorker();
      map.on("moveend", refresh);
      map.on("idle", refresh);
      refresh();
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
      for (const model of models) {
        if (!active.has(model.id)) continue;
        const entry = cache.get(model.id);
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
        gl.drawArrays(gl.TRIANGLES, 0, entry.count);
      }
      gl.bindVertexArray(previous);
    },
    onRemove() {
      removed = true;
      map.off("moveend", refresh);
      map.off("idle", refresh);
      worker.dispose();
      cache.clear();
      delete map.getContainer().dataset.activeModels;
      delete map.getContainer().dataset.modelCacheBytes;
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      delete map.getContainer().dataset.detailedModels;
    },
  };
}
