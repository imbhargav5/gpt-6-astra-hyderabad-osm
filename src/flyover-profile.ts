import type { FeatureCollection, Polygon, Position } from "geojson";
export const profileKey = (p: Position) =>
  `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
const distance = (a: Position, b: Position) =>
  Math.hypot((a[0] - b[0]) * 106100, (a[1] - b[1]) * 111320);

// A continuous, grade-limited clearance envelope over connected road centrelines.
// Shared nodes share elevations, even when their polygons land in separate GPU chunks.
export function buildDeckProfiles(
  data: FeatureCollection<Polygon>,
  sample: (p: Position) => number | null,
) {
  const nodes = new Map<
    string,
    { p: Position; z: number; edges: Map<string, number> }
  >();
  for (const f of data.features) {
    const p = f.properties!;
    if (p.part !== "deck" || !p.a || !p.b) continue;
    const keys = [p.a, p.b].map((v: Position) => {
      const key = profileKey(v);
      if (!nodes.has(key)) {
        const z = sample(v);
        if (z !== null) nodes.set(key, { p: v, z, edges: new Map() });
      }
      return key;
    });
    const a = nodes.get(keys[0]),
      b = nodes.get(keys[1]);
    if (a && b) {
      const d = distance(a.p, b.p);
      a.edges.set(keys[1], d);
      b.edges.set(keys[0], d);
    }
  }
  // Max-heap propagation spreads a terrain rise gradually along the road instead
  // of warping individual corners. Four-percent secants bound eased slopes at 6%.
  const heap: [number, string][] = [];
  const push = (entry: [number, string]) => {
    let i = heap.length;
    heap.push(entry);
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (heap[p][0] >= entry[0]) break;
      heap[i] = heap[p];
      i = p;
    }
    heap[i] = entry;
  };
  const pop = () => {
    const result = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let c = i * 2 + 1;
        if (c + 1 < heap.length && heap[c + 1][0] > heap[c][0]) c++;
        if (heap[c][0] <= last[0]) break;
        heap[i] = heap[c];
        i = c;
      }
      heap[i] = last;
    }
    return result;
  };
  for (const [key, n] of nodes) push([n.z, key]);
  while (heap.length) {
    const [z, key] = pop(),
      n = nodes.get(key)!;
    if (z < n.z) continue;
    for (const [k, d] of n.edges) {
      const next = nodes.get(k)!,
        candidate = z - 0.04 * d;
      if (candidate > next.z + 1e-6) {
        next.z = candidate;
        push([candidate, k]);
      }
    }
  }
  return new Map([...nodes].map(([k, n]) => [k, n.z]));
}
export function deckGround(
  p: Position,
  a: Position,
  b: Position,
  profiles: Map<string, number>,
) {
  const za = profiles.get(profileKey(a)),
    zb = profiles.get(profileKey(b));
  if (za === undefined || zb === undefined) return null;
  const dx = (b[0] - a[0]) * 106100,
    dy = (b[1] - a[1]) * 111320;
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p[0] - a[0]) * 106100 * dx + (p[1] - a[1]) * 111320 * dy) /
        (dx * dx + dy * dy || 1),
    ),
  );
  return za + (zb - za) * t * t * (3 - 2 * t);
}
