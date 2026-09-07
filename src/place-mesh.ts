export type V3 = [number, number, number];
export type Color = V3;
export const stone: Color = [0.83, 0.81, 0.72],
  marble: Color = [0.95, 0.93, 0.86],
  shadow: Color = [0.35, 0.4, 0.37],
  sandstone: Color = [0.72, 0.39, 0.24],
  gold: Color = [0.81, 0.64, 0.32],
  glass: Color = [0.44, 0.64, 0.65];
/** Batched meter-space geometry with per-face normals and restrained stone materials. */
export class PlaceMesh {
  vertices: number[] = [];
  triangle(a: V3, b: V3, c: V3, color: Color) {
    const u = b.map((v, i) => v - a[i]),
      v = c.map((v, i) => v - a[i]);
    let n = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0],
    ];
    const length = Math.hypot(...n);
    if (length < 1e-8) return;
    n = n.map((x) => x / length);
    for (const p of [a, b, c]) this.vertices.push(...p, ...n, ...color);
  }
  quad(a: V3, b: V3, c: V3, d: V3, color: Color) {
    this.triangle(a, b, c, color);
    this.triangle(a, c, d, color);
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    d: number,
    h: number,
    color: Color = stone,
  ) {
    const p: V3[] = [
      [x, y, z],
      [x + w, y, z],
      [x + w, y + d, z],
      [x, y + d, z],
      [x, y, z + h],
      [x + w, y, z + h],
      [x + w, y + d, z + h],
      [x, y + d, z + h],
    ];
    for (const [a, b, c, d] of [
      [0, 3, 2, 1],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [1, 2, 6, 5],
      [2, 3, 7, 6],
      [3, 0, 4, 7],
    ])
      this.quad(p[a], p[b], p[c], p[d], color);
  }
  beam(a: V3, b: V3, r: number, color: Color = marble, sides = 8) {
    const d = b.map((v, i) => v - a[i]),
      len = Math.hypot(...d);
    if (len < 1e-6) return;
    const n = d.map((v) => v / len),
      u = Math.abs(n[2]) < 0.9 ? [-n[1], n[0], 0] : [0, -n[2], n[1]];
    const l = Math.hypot(...u);
    for (let i = 0; i < 3; i++) u[i] /= l;
    const v = [
      n[1] * u[2] - n[2] * u[1],
      n[2] * u[0] - n[0] * u[2],
      n[0] * u[1] - n[1] * u[0],
    ];
    const p = (c: V3, i: number): V3 =>
      c.map(
        (val, j) =>
          val +
          r *
            (u[j] * Math.cos((i / sides) * 2 * Math.PI) +
              v[j] * Math.sin((i / sides) * 2 * Math.PI)),
      ) as V3;
    for (let i = 0; i < sides; i++) {
      this.quad(p(a, i), p(a, i + 1), p(b, i + 1), p(b, i), color);
      this.triangle(a, p(a, i + 1), p(a, i), color);
      this.triangle(b, p(b, i), p(b, i + 1), color);
    }
  }
  lathe(
    x: number,
    y: number,
    rings: [number, number][],
    color: Color = marble,
    segments = 40,
  ) {
    const p = (ring: number, i: number): V3 => [
      x + Math.cos((i / segments) * 2 * Math.PI) * rings[ring][1],
      y + Math.sin((i / segments) * 2 * Math.PI) * rings[ring][1],
      rings[ring][0],
    ];
    for (let ring = 0; ring < rings.length - 1; ring++)
      for (let i = 0; i < segments; i++)
        this.quad(
          p(ring, i),
          p(ring, i + 1),
          p(ring + 1, i + 1),
          p(ring + 1, i),
          color,
        );
    for (let i = 0; i < segments; i++) {
      this.triangle([x, y, rings[0][0]], p(0, i + 1), p(0, i), color);
      const j = rings.length - 1;
      this.triangle([x, y, rings[j][0]], p(j, i), p(j, i + 1), color);
    }
  }
  dome(
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    color: Color = marble,
    onion = false,
  ) {
    const rings: [number, number][] = [];
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const radius = onion
        ? r * Math.sin(Math.PI * (0.22 + 0.78 * t)) * (1 - 0.15 * t)
        : r * Math.sqrt(Math.max(0, 1 - t * t));
      rings.push([z + h * t, Math.max(0.02, radius)]);
    }
    this.lathe(x, y, rings, color);
    this.beam([x, y, z + h], [x, y, z + h + 1.3], 0.12, gold);
  }
  hall(w: number, d: number, h: number, color: Color = marble, floors = 2) {
    this.box(-w / 2, -d / 2, 0, w, d, h, color);
    for (let f = 0; f <= floors; f++)
      this.box(
        -w / 2 - 0.35,
        -d / 2 - 0.35,
        (f * h) / floors,
        w + 0.7,
        d + 0.7,
        0.25,
        stone,
      );
    for (const side of [-1, 1]) {
      for (let x = -w / 2 + 2; x < w / 2 - 1; x += 3.5)
        for (let f = 0; f < floors; f++) {
          this.box(
            x - 0.7,
            (side * d) / 2 - 0.12,
            1 + (f * h) / floors,
            1.4,
            0.24,
            (h / floors) * 0.55,
            shadow,
          );
          this.box(
            x - 0.88,
            (side * d) / 2 - 0.25,
            0.85 + (f * h) / floors,
            1.76,
            0.5,
            0.18,
            stone,
          );
        }
      for (let y = -d / 2 + 2; y < d / 2 - 1; y += 3.5)
        for (let f = 0; f < floors; f++)
          this.box(
            (side * w) / 2 - 0.12,
            y - 0.7,
            1 + (f * h) / floors,
            0.24,
            1.4,
            (h / floors) * 0.55,
            shadow,
          );
    }
    for (let x = -w / 2; x <= w / 2; x += 3.5)
      for (const side of [-1, 1])
        this.box(x - 0.17, (side * d) / 2 - 0.24, 0, 0.34, 0.48, h, stone);
  }
  shikhara(
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    color: Color,
  ) {
    const rings: [number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      rings.push([z + t * h, Math.max(0.22, r * Math.pow(1 - t, 0.6))]);
    }
    this.lathe(x, y, rings, color, 32);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * 2 * Math.PI;
      for (let j = 0; j < 12; j++) {
        const t = j / 14,
          u = (j + 1) / 14,
          rr = r * Math.pow(1 - t, 0.6) + 0.09,
          rr2 = r * Math.pow(1 - u, 0.6) + 0.09;
        this.beam(
          [x + rr * Math.cos(a), y + rr * Math.sin(a), z + t * h],
          [x + rr2 * Math.cos(a), y + rr2 * Math.sin(a), z + u * h],
          0.11,
          stone,
          6,
        );
      }
    }
    for (let i = 1; i < 8; i++) {
      const t = i / 9,
        rr = r * Math.pow(1 - t, 0.6);
      this.lathe(
        x,
        y,
        [
          [z + h * t, rr + 0.13],
          [z + h * t + 0.16, rr + 0.13],
        ],
        color,
        32,
      );
    }
    this.lathe(
      x,
      y,
      [
        [z + h, 0.7],
        [z + h + 0.4, 1.1],
        [z + h + 0.85, 0.8],
        [z + h + 1, 0.45],
      ],
      gold,
      24,
    );
    this.beam([x, y, z + h + 1], [x, y, z + h + 3], 0.09, gold);
    this.triangle(
      [x, y, z + h + 2.9],
      [x + 1.7, y, z + h + 2.5],
      [x, y, z + h + 2.1],
      [0.72, 0.32, 0.17],
    );
  }
  portal(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    color: Color = marble,
  ) {
    this.box(x - w / 2, y - 0.5, z, 1, 1, h * 0.65, color);
    this.box(x + w / 2 - 1, y - 0.5, z, 1, 1, h * 0.65, color);
    const r = (w - 2) / 2,
      cz = z + h * 0.65;
    for (let i = 0; i < 20; i++) {
      const a = (i / 20) * Math.PI,
        b = ((i + 1) / 20) * Math.PI;
      this.beam(
        [x + Math.cos(a) * r, y, cz + Math.sin(a) * r],
        [x + Math.cos(b) * r, y, cz + Math.sin(b) * r],
        0.55,
        color,
        6,
      );
    }
  }
  finish() {
    return new Float32Array(this.vertices);
  }
}
