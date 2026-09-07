import {
  MercatorCoordinate,
  type CustomLayerInterface,
  type Map,
  type MapSourceDataEvent,
} from "maplibre-gl";
import RBush from "rbush";
import { CITY_BOUNDS } from "./city-slab";
import {
  containsTree,
  seededCell,
  patchNoise,
  type ForestShape,
} from "./forest-geometry";
import type { Theme } from "./map-style";

type Settings = {
  visible: boolean;
  height: number;
  terrain: number;
  terrainOn: boolean;
  theme: Theme;
};
type Indexed = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  shape: ForestShape;
};
function indexShape(shape: ForestShape): Indexed {
  const box: Indexed = {
    minX: Infinity,
    minY: Infinity,
    maxX: -Infinity,
    maxY: -Infinity,
    shape,
  };
  const walk = (coordinates: unknown) => {
    const c = coordinates as unknown[];
    if (typeof c[0] === "number" && typeof c[1] === "number") {
      box.minX = Math.min(box.minX, c[0]);
      box.maxX = Math.max(box.maxX, c[0]);
      box.minY = Math.min(box.minY, c[1]);
      box.maxY = Math.max(box.maxY, c[1]);
    } else c.forEach(walk);
  };
  walk(shape.coordinates);
  return box;
}
const origin = MercatorCoordinate.fromLngLat([78.43, 17.38]);
const units = origin.meterInMercatorCoordinateUnits();

/** Illustrative low-poly vegetation, sampled from mapped green polygons, not individual tree observations. */
export function forestLayer(settings: () => Settings): CustomLayerInterface {
  let map: Map,
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    buffer: WebGLBuffer,
    vao: WebGLVertexArrayObject;
  let matrixUniform: WebGLUniformLocation | null,
    colorUniform: WebGLUniformLocation | null,
    fogUniform: WebGLUniformLocation | null,
    fogRangeUniform: WebGLUniformLocation | null;
  let shadowVertices = 0;
  let vertices = 0,
    dirty = true,
    signature = "";
  const markDirty = () => {
    dirty = true;
  };
  const sourceChanged = (e: MapSourceDataEvent) => {
    if (e.isSourceLoaded && ["osm", "terrain"].includes(e.sourceId))
      dirty = true;
  };
  function rebuild() {
    if (!dirty || !settings().visible || !map.getSource("osm")) return;
    dirty = false;
    const s = settings(),
      zoom = map.getZoom(),
      stride = zoom >= 15 ? 1 : zoom >= 13 ? 2 : zoom >= 11 ? 4 : 8;
    const lngMeters = 111320 * 0.954,
      latMeters = 111320,
      spacing = 24;
    const extent = map.getBounds();
    const west = Math.max(CITY_BOUNDS[0] + 0.004, extent.getWest()),
      east = Math.min(CITY_BOUNDS[2] - 0.004, extent.getEast());
    const south = Math.max(CITY_BOUNDS[1] + 0.004, extent.getSouth()),
      north = Math.min(CITY_BOUNDS[3] - 0.004, extent.getNorth());
    const greens = [
      ...map.querySourceFeatures("osm", {
        sourceLayer: "landcover",
        filter: ["==", "class", "wood"],
      }),
    ]
      .filter(
        (f) =>
          f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon",
      )
      .map((f) => indexShape(f.geometry as ForestShape));
    map.getContainer().dataset.woodlandPolygons = String(greens.length);
    const center = map.getCenter();
    greens.sort(
      (a, b) =>
        Math.hypot(
          (a.minX + a.maxX) / 2 - center.lng,
          (a.minY + a.maxY) / 2 - center.lat,
        ) -
        Math.hypot(
          (b.minX + b.maxX) / 2 - center.lng,
          (b.minY + b.maxY) / 2 - center.lat,
        ),
    );
    const exclusions = new RBush<Indexed>();
    for (const sourceLayer of [
      "water",
      "building",
      "transportation",
      "aeroway",
    ]) {
      const features = map.querySourceFeatures("osm", { sourceLayer });
      const boxes = features
        .filter((f) =>
          ["Polygon", "MultiPolygon", "LineString", "MultiLineString"].includes(
            f.geometry.type,
          ),
        )
        .map((f) => {
          const item = indexShape(f.geometry as ForestShape);
          const pad =
            sourceLayer === "transportation" || sourceLayer === "aeroway"
              ? 12 / 111320
              : 0;
          item.minX -= pad / 0.954;
          item.maxX += pad / 0.954;
          item.minY -= pad;
          item.maxY += pad;
          return item;
        });
      exclusions.load(boxes);
    }
    const positions: number[] = [];
    const shadows: number[] = [];
    let tint = 0;
    const seen = new Set<string>();
    let attempts = 0,
      trees = 0;
    function vertex(x: number, y: number, z: number, shade: number, trunk = 0) {
      positions.push(x, y, z, shade, trunk, tint);
    }
    outer: for (const green of greens) {
      const minX =
          Math.ceil(
            (Math.max(green.minX, west) * lngMeters) / spacing / stride,
          ) * stride,
        maxX = Math.floor((Math.min(green.maxX, east) * lngMeters) / spacing);
      const minY =
          Math.ceil(
            (Math.max(green.minY, south) * latMeters) / spacing / stride,
          ) * stride,
        maxY = Math.floor((Math.min(green.maxY, north) * latMeters) / spacing);
      for (let x = minX; x <= maxX; x += stride)
        for (let y = minY; y <= maxY; y += stride) {
          if (++attempts > 120000 || trees >= 8000) break outer;
          const key = `${x}:${y}`;
          if (seen.has(key)) continue;
          const random = seededCell(x, y);
          const patch = patchNoise(x / (10 * stride), y / (10 * stride));
          if (random < 0.08 + patch * 0.52) continue;
          const lng =
              ((x + (0.15 + random * 0.7) * stride) * spacing) / lngMeters,
            lat =
              ((y + (0.15 + seededCell(y, x) * 0.7) * stride) * spacing) /
              latMeters;
          if (lng < west || lng > east || lat < south || lat > north) continue;
          if (!containsTree(lng, lat, green.shape)) continue;
          if (
            exclusions
              .search({ minX: lng, minY: lat, maxX: lng, maxY: lat })
              .some((item) => containsTree(lng, lat, item.shape))
          )
            continue;
          seen.add(key);
          const elevation = map.queryTerrainElevation([lng, lat]);
          if (s.terrainOn && (elevation === null || elevation === 0)) continue;
          const p = MercatorCoordinate.fromLngLat([lng, lat], elevation ?? 0);
          const px = p.x - origin.x,
            py = p.y - origin.y,
            pz = p.z;
          const scale = s.height * Math.min(stride, 3);
          const height = (8 + seededCell(x + 19, y - 37) * 17) * scale * units,
            radius = (2.5 + seededCell(x - 29, y + 13) * 3.4) * scale * units,
            trunk = (1.4 + random) * scale * units;
          tint = seededCell(x + 79, y - 53);
          // Ground-following contact shadows anchor the canopy without a flat floating disc.
          const groundRadius = radius / units;
          const shadowPoints = Array.from({ length: 10 }, (_, i) => {
            const angle = (i * Math.PI) / 5;
            const dx = Math.cos(angle) * groundRadius,
              dy = Math.sin(angle) * groundRadius;
            const ll: [number, number] = [
              lng + dx / lngMeters,
              lat + dy / latMeters,
            ];
            const elevationAtPoint =
              map.queryTerrainElevation(ll) ?? elevation ?? 0;
            const merc = MercatorCoordinate.fromLngLat(
              ll,
              elevationAtPoint + 1.2,
            );
            return [merc.x - origin.x, merc.y - origin.y, merc.z];
          });
          for (let i = 0; i < 10; i++) {
            shadows.push(
              px,
              py,
              pz + 1.2 * units,
              0.22,
              2,
              0,
              ...shadowPoints[i],
              0,
              2,
              0,
              ...shadowPoints[(i + 1) % 10],
              0,
              2,
              0,
            );
          }
          const phase = random * Math.PI * 2;
          for (let side = 0; side < 6; side++) {
            const a = phase + (side * Math.PI) / 3,
              b = a + Math.PI / 3;
            const shade = 0.72 + (0.34 * (Math.cos(a - 2.5) + 1)) / 2;
            vertex(
              px + Math.cos(phase) * radius * 0.12,
              py + Math.sin(phase) * radius * 0.12,
              pz + height,
              shade,
            );
            vertex(
              px + Math.cos(a) * radius,
              py + Math.sin(a) * radius,
              pz + trunk,
              shade,
            );
            vertex(
              px + Math.cos(b) * radius,
              py + Math.sin(b) * radius,
              pz + trunk,
              shade,
            );
          }
          const r = 0.5 * scale * units;
          for (let side = 0; side < 4; side++) {
            const a = (side * Math.PI) / 2,
              b = a + Math.PI / 2;
            const ax = px + Math.cos(a) * r,
              ay = py + Math.sin(a) * r,
              bx = px + Math.cos(b) * r,
              by = py + Math.sin(b) * r;
            vertex(ax, ay, pz, 1, 1);
            vertex(bx, by, pz, 1, 1);
            vertex(ax, ay, pz + trunk, 1, 1);
            vertex(bx, by, pz, 1, 1);
            vertex(bx, by, pz + trunk, 1, 1);
            vertex(ax, ay, pz + trunk, 1, 1);
          }
          trees++;
        }
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([...shadows, ...positions]),
      gl.STATIC_DRAW,
    );
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    shadowVertices = shadows.length / 6;
    vertices = positions.length / 6;
    map.getContainer().dataset.treeCount = String(trees);
    map.triggerRepaint();
  }
  return {
    id: "forest-trees",
    type: "custom",
    renderingMode: "3d",
    onAdd(m, context) {
      map = m;
      gl = context as WebGL2RenderingContext;
      const shader = (type: number, source: string) => {
        const sh = gl.createShader(type)!;
        gl.shaderSource(sh, source);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS))
          throw new Error(
            gl.getShaderInfoLog(sh) ?? "Tree shader compilation failed",
          );
        return sh;
      };
      const vert = shader(
        gl.VERTEX_SHADER,
        `#version 300 es
        precision highp float;
        in vec3 a_position;in float a_shade;in float a_trunk;in float a_tint;
        uniform mat4 u_matrix;out float v_shade;out float v_trunk;out float v_tint;out float v_depth;
        void main(){gl_Position=u_matrix*vec4(a_position,1.0);v_shade=a_shade;v_trunk=a_trunk;v_tint=a_tint;v_depth=gl_Position.w;}`,
      );
      const frag = shader(
        gl.FRAGMENT_SHADER,
        `#version 300 es
        precision highp float;
        in float v_shade;in float v_trunk;in float v_tint;in float v_depth;
        uniform vec3 u_color[3];uniform vec3 u_fog;uniform vec2 u_fogRange;out vec4 fragColor;
        void main(){
          if(v_trunk>1.5){fragColor=vec4(vec3(.21,.3,.16)*v_shade,v_shade);return;}
          vec3 leaf=v_tint<.5?mix(u_color[0],u_color[1],v_tint*2.0):mix(u_color[1],u_color[2],(v_tint-.5)*2.0);
          vec3 c=mix(leaf,vec3(.4,.35,.24),v_trunk)*v_shade;
          float haze=smoothstep(u_fogRange.x,u_fogRange.y,v_depth)*.42;
          fragColor=vec4(mix(c,u_fog,haze),1.0);
        }`,
      );
      program = gl.createProgram()!;
      gl.attachShader(program, vert);
      gl.attachShader(program, frag);
      gl.linkProgram(program);
      gl.deleteShader(vert);
      gl.deleteShader(frag);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(
          gl.getProgramInfoLog(program) ?? "Tree shader linking failed",
        );
      matrixUniform = gl.getUniformLocation(program, "u_matrix");
      colorUniform = gl.getUniformLocation(program, "u_color[0]");
      fogUniform = gl.getUniformLocation(program, "u_fog");
      fogRangeUniform = gl.getUniformLocation(program, "u_fogRange");
      buffer = gl.createBuffer()!;
      vao = gl.createVertexArray()!;
      const previous = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      gl.bindVertexArray(vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      for (const [name, size, offset] of [
        ["a_position", 3, 0],
        ["a_shade", 1, 12],
        ["a_trunk", 1, 16],
        ["a_tint", 1, 20],
      ] as const) {
        const loc = gl.getAttribLocation(program, name);
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 24, offset);
      }
      gl.bindVertexArray(previous);
      gl.bindBuffer(gl.ARRAY_BUFFER, null);
      map.on("moveend", markDirty);
      map.on("sourcedata", sourceChanged);
      map.on("idle", rebuild);
    },
    render(_context, args) {
      const s = settings();
      const next = `${s.height}/${s.terrain}/${s.terrainOn}/${s.visible}`;
      if (next !== signature) {
        signature = next;
        dirty = true;
      }
      if (!s.visible || !vertices) return;
      const raw = args.defaultProjectionData.mainMatrix;
      const matrix = new Float32Array(raw);
      for (let i = 0; i < 4; i++)
        matrix[12 + i] =
          raw[12 + i] + raw[i] * origin.x + raw[4 + i] * origin.y;
      gl.useProgram(program);
      gl.uniformMatrix4fv(matrixUniform, false, matrix);
      gl.uniform3fv(
        colorUniform,
        s.theme === "night"
          ? [0.18, 0.32, 0.25, 0.29, 0.43, 0.28, 0.43, 0.49, 0.3]
          : s.theme === "sunset"
            ? [0.34, 0.46, 0.29, 0.58, 0.63, 0.35, 0.76, 0.75, 0.49]
            : [0.28, 0.43, 0.31, 0.49, 0.61, 0.34, 0.7, 0.76, 0.47],
      );
      gl.uniform3fv(
        fogUniform,
        s.theme === "night"
          ? [0.07, 0.12, 0.16]
          : s.theme === "sunset"
            ? [0.92, 0.77, 0.68]
            : [0.88, 0.91, 0.87],
      );
      gl.uniform2f(fogRangeUniform, args.farZ * 0.16, args.farZ * 0.85);
      const previous = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      gl.bindVertexArray(vao);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.CULL_FACE);
      gl.depthMask(false);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.drawArrays(gl.TRIANGLES, 0, shadowVertices);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
      gl.drawArrays(gl.TRIANGLES, shadowVertices, vertices);
      gl.bindVertexArray(previous);
    },
    onRemove() {
      map.off("moveend", markDirty);
      map.off("sourcedata", sourceChanged);
      map.off("idle", rebuild);
      gl.deleteBuffer(buffer);
      gl.deleteVertexArray(vao);
      gl.deleteProgram(program);
      delete map.getContainer().dataset.treeCount;
      delete map.getContainer().dataset.woodlandPolygons;
    },
  };
}
