import { afterEach, describe, expect, it, vi } from "vitest";
import type { Map as MapLibreMap } from "maplibre-gl";
import { NavigationFocusStore } from "./navigation-focus";
import { installLandmarkDetails } from "./landmark-detail";
import { placeModelsLayer, PLACE_MODELS } from "./place-models";

const jobs = vi.hoisted(
  () => [] as { job: any; resolve: (value: any) => void }[],
);
vi.mock("./geometry-worker-client", () => ({
  GeometryWorker: class {
    run(job: any) {
      return new Promise((resolve) => jobs.push({ job, resolve }));
    }
    dispose() {}
  },
}));
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};
function mapHarness() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  const data: Record<string, string> = {};
  const source = { setData: vi.fn() };
  let installed = false;
  const map = {
    on: (name: string, fn: (...args: any[]) => void) => {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name)!.add(fn);
    },
    off: (name: string, fn: (...args: any[]) => void) =>
      listeners.get(name)?.delete(fn),
    fire: (name: string, event?: unknown) =>
      listeners.get(name)?.forEach((fn) => fn(event)),
    getContainer: () => ({ dataset: data }),
    getSource: () => (installed ? source : undefined),
    addSource: () => {
      installed = true;
    },
    addLayer: () => {},
    getLayer: () => true,
    setLayoutProperty: () => {},
    setPaintProperty: () => {},
    setFilter: () => {},
    querySourceFeatures: () => [],
    isMoving: () => true,
    areTilesLoaded: () => false,
    getZoom: () => 14,
    getCenter: () => ({ toArray: () => [78.1, 17.1] }),
    getBounds: () => ({
      getWest: () => 78.09,
      getEast: () => 78.11,
      getSouth: () => 17.09,
      getNorth: () => 17.11,
    }),
    triggerRepaint: vi.fn(),
  };
  return { map, data, source, typed: map as unknown as MapLibreMap };
}
afterEach(() => {
  jobs.length = 0;
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("destination streaming integration", () => {
  it("builds architecture during movement and rejects results from a superseded destination", async () => {
    const h = mapHarness();
    const focus = new NavigationFocusStore();
    const dispose = installLandmarkDetails(
      h.typed,
      () => ({ height: 1, theme: "day", visible: true }),
      focus,
    );
    h.map.fire("style.load");
    focus.select(
      { id: "charminar", coordinates: [78.474, 17.36], zoom: 17 },
      1200,
      900,
    );
    await flush();
    expect(jobs[0].job.center).toEqual([78.474, 17.36]);
    focus.select(
      { id: "golconda", coordinates: [78.4, 17.38], zoom: 17 },
      1200,
      900,
    );
    const result = { type: "FeatureCollection", features: [] };
    jobs[0].resolve(result);
    await flush();
    expect(h.source.setData).not.toHaveBeenCalled();
    expect(jobs[1].job.focus.id).toBe("golconda");
    jobs[1].resolve(result);
    await flush();
    expect(h.source.setData).toHaveBeenCalledWith(result);
    expect(focus.readyForPrefetch).toBe(false);
    // Updating the architecture source can itself make areTilesLoaded false.
    // A previously observed tile-ready signal must still release tour prefetch.
    vi.useFakeTimers();
    h.map.isMoving = () => false;
    h.data.destinationTilesReadyMs = "100";
    h.map.fire("atlas:tiles-ready");
    await vi.advanceTimersByTimeAsync(160);
    jobs.at(-1)!.resolve(result);
    await flush();
    expect(focus.readyForPrefetch).toBe(true);
    expect(h.data.destinationSurroundingsReadyMs).toBeDefined();
    dispose();
  });
  it("requests an offscreen selected model immediately, discards stale meshes, and reuses uploaded models", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) =>
      setTimeout(callback, 16),
    );
    vi.stubGlobal("cancelAnimationFrame", clearTimeout);
    const h = mapHarness();
    const focus = new NavigationFocusStore();
    const upload = vi.fn();
    const gl = new Proxy(
      {
        bufferData: upload,
        getShaderParameter: () => true,
        getProgramParameter: () => true,
      },
      {
        get: (target, key) =>
          key in target ? target[key as keyof typeof target] : () => ({}),
      },
    ) as unknown as WebGL2RenderingContext;
    const layer = placeModelsLayer(
      () => ({ height: 1, theme: "day", visible: true, terrainOn: false }),
      focus,
    );
    layer.onAdd!(h.typed, gl);
    const a = PLACE_MODELS[0],
      b = PLACE_MODELS[1];
    focus.select({ id: a.id, coordinates: a.center, zoom: 17 }, 400, 400);
    expect(jobs[0].job.id).toBe(a.id);
    focus.select({ id: b.id, coordinates: b.center, zoom: 17 }, 400, 400);
    jobs[0].resolve(new Float32Array(9));
    await flush();
    expect(upload).not.toHaveBeenCalled();
    expect(jobs[1].job.id).toBe(b.id);
    jobs[1].resolve(new Float32Array(9));
    await flush();
    expect(upload).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(16);
    expect(upload).toHaveBeenCalledOnce();
    expect(h.data.detailedModels).toContain(b.id);
    const count = jobs.filter((j) => j.job.id === b.id).length;
    focus.clear();
    focus.select({ id: b.id, coordinates: b.center, zoom: 17 }, 400, 400);
    expect(jobs.filter((j) => j.job.id === b.id)).toHaveLength(count);
    layer.onRemove!(h.typed, gl);
  });
  it("waits for destination readiness before tour prefetch and respects layer toggles", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", (callback: () => void) =>
      setTimeout(callback, 16),
    );
    vi.stubGlobal("cancelAnimationFrame", clearTimeout);
    const h = mapHarness();
    const focus = new NavigationFocusStore();
    let visible = false;
    const gl = new Proxy(
      {},
      { get: () => () => ({}) },
    ) as WebGL2RenderingContext;
    const layer = placeModelsLayer(
      () => ({ height: 1, theme: "day", visible, terrainOn: false }),
      focus,
    );
    layer.onAdd!(h.typed, gl);
    const a = PLACE_MODELS[0],
      next = PLACE_MODELS.find((m) => m.id === "chilkur-balaji")!;
    expect(next).toBeDefined();
    focus.select({ id: a.id, coordinates: a.center, zoom: 18 }, 400, 400, {
      id: next.id,
      coordinates: next.center,
      zoom: 18,
    });
    expect(jobs).toHaveLength(0);
    visible = true;
    h.map.fire("atlas:settings");
    expect(jobs[0].job.id).toBe(a.id);
    let processed = 0;
    while (processed < jobs.length && processed < 30) {
      jobs[processed++].resolve(new Float32Array(9));
      await flush();
      await vi.advanceTimersByTimeAsync(16);
    }
    expect(jobs.some((j) => j.job.id === next.id)).toBe(false);
    focus.markReady(focus.revision);
    expect(jobs.at(-1)!.job.id).toBe(next.id);
    visible = false;
    h.map.fire("atlas:settings");
    jobs.at(-1)!.resolve(new Float32Array(9));
    await flush();
    await vi.advanceTimersByTimeAsync(16);
    expect(h.data.detailedModels).not.toContain(next.id);
    layer.onRemove!(h.typed, gl);
  });
});
