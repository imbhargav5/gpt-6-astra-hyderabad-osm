import { inStreamBounds, type StreamBounds } from "./spatial-stream";

export type Destination = {
  id: string;
  coordinates: [number, number];
  zoom: number;
};
export type NavigationFocus = Destination & {
  revision: number;
  startedAt: number;
  bounds: StreamBounds;
  next?: Destination;
};

export function distanceMeters(a: number[], b: number[]) {
  return Math.hypot(
    (a[0] - b[0]) * 111320 * Math.cos((b[1] * Math.PI) / 180),
    (a[1] - b[1]) * 111320,
  );
}

/** Selected site, immediate surroundings, destination view, current view. */
export function detailPriority(
  id: string,
  center: number[],
  focus?: NavigationFocus,
) {
  if (!focus) return 3;
  if (id === focus.id) return 0;
  if (distanceMeters(center, focus.coordinates) <= 500) return 1;
  return inStreamBounds(center, focus.bounds) ? 2 : 3;
}

export class NavigationFocusStore {
  current?: NavigationFocus;
  revision = 0;
  readyForPrefetch = false;
  private listeners = new Set<(reason: "focus" | "ready") => void>();
  select(
    destination: Destination,
    width: number,
    height: number,
    next?: Destination,
  ) {
    this.readyForPrefetch = false;
    const [lng, lat] = destination.coordinates;
    // Conservative destination coverage at the app's 60-degree arrival pitch.
    const metersPerPixel =
      (40075017 * Math.cos((lat * Math.PI) / 180)) /
      (512 * 2 ** destination.zoom);
    const radius = Math.max(500, Math.max(width, height) * metersPerPixel * 2);
    const dy = radius / 111320,
      dx = dy / Math.cos((lat * Math.PI) / 180);
    this.current = {
      ...destination,
      revision: ++this.revision,
      startedAt: performance.now(),
      bounds: [lng - dx, lat - dy, lng + dx, lat + dy],
      next,
    };
    this.emit();
  }
  clear() {
    this.readyForPrefetch = false;
    this.current = undefined;
    this.revision++;
    this.emit();
  }
  stopPrefetch() {
    if (this.current?.next) {
      this.current = { ...this.current, next: undefined };
      this.emit();
    }
  }
  markReady(revision: number) {
    if (revision !== this.revision || this.readyForPrefetch) return;
    this.readyForPrefetch = true;
    this.listeners.forEach((listener) => listener("ready"));
  }
  subscribe(listener: (reason: "focus" | "ready") => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  private emit() {
    this.listeners.forEach((listener) => listener("focus"));
  }
}

/** Only one job is dispatched; replacing the queue drops obsolete waiting work. */
export class LatestQueue<T> {
  private waiting: T[] = [];
  private running = false;
  private disposed = false;
  constructor(
    private execute: (item: T) => Promise<void>,
    private failed: (error: unknown) => void,
  ) {}
  replace(items: T[]) {
    this.waiting = items;
    void this.drain();
  }
  dispose() {
    this.disposed = true;
    this.waiting = [];
  }
  private async drain() {
    if (this.running || this.disposed) return;
    this.running = true;
    try {
      while (!this.disposed && this.waiting.length) {
        try {
          await this.execute(this.waiting.shift()!);
        } catch (error) {
          if (!this.disposed) this.failed(error);
        }
      }
    } finally {
      this.running = false;
    }
  }
}
