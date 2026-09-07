import type { Feature, Geometry } from "geojson";
/** Materialize MapLibre's prototype getters before structured-cloning to a worker. */
export function plainFeature<G extends Geometry>(
  feature: Feature<G>,
): Feature<G> {
  return {
    type: "Feature",
    id: feature.id,
    geometry: feature.geometry,
    properties: feature.properties,
  };
}
/** Conservative geographic coverage, including a prefetch margin and model extents. */
export type StreamBounds = [number, number, number, number];
export function streamBounds(bounds: {
  getWest(): number;
  getEast(): number;
  getSouth(): number;
  getNorth(): number;
}): StreamBounds {
  const dx = Math.max(0.004, (bounds.getEast() - bounds.getWest()) * 0.2);
  const dy = Math.max(0.004, (bounds.getNorth() - bounds.getSouth()) * 0.2);
  return [
    bounds.getWest() - dx,
    bounds.getSouth() - dy,
    bounds.getEast() + dx,
    bounds.getNorth() + dy,
  ];
}
export function inStreamBounds(p: number[], b: StreamBounds) {
  return p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
}
/** LRU cache: visible resources are pinned; only recently departed resources are evicted. */
export class ResourceCache<T> {
  private entries = new Map<string, { value: T; bytes: number }>();
  bytes = 0;
  constructor(
    private budget: number,
    private release: (value: T) => void,
  ) {}
  keys() {
    return this.entries.keys();
  }
  get(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value;
  }
  set(key: string, value: T, bytes: number, pinned = new Set<string>()) {
    this.delete(key);
    this.entries.set(key, { value, bytes });
    this.bytes += bytes;
    this.trim(pinned);
  }
  private delete(key: string) {
    const entry = this.entries.get(key);
    if (!entry) return;
    this.release(entry.value);
    this.bytes -= entry.bytes;
    this.entries.delete(key);
  }
  trim(pinned: Set<string>) {
    for (const key of this.entries.keys()) {
      if (this.bytes <= this.budget) break;
      if (!pinned.has(key)) this.delete(key);
    }
  }
  clear() {
    for (const key of this.entries.keys()) this.delete(key);
  }
}
