import { describe, expect, it, vi } from "vitest";
import {
  NavigationFocusStore,
  LatestQueue,
  detailPriority,
} from "./navigation-focus";

const destination = {
  id: "charminar",
  coordinates: [78.47467, 17.36156] as [number, number],
  zoom: 17,
};
const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("destination priority", () => {
  it("orders the selected site, 500m surroundings, destination view, then background", () => {
    const store = new NavigationFocusStore();
    store.select(destination, 1200, 900);
    const focus = store.current!;
    expect(detailPriority("charminar", [78.49, 17.36], focus)).toBe(0);
    expect(detailPriority("nearby", [78.475, 17.362], focus)).toBe(1);
    expect(
      detailPriority("view", [focus.bounds[0] + 0.00001, 17.36156], focus),
    ).toBe(2);
    expect(detailPriority("distant", [78.3, 17.5], focus)).toBe(3);
  });
  it("publishes new revisions synchronously and releases focus on manual navigation", () => {
    const store = new NavigationFocusStore();
    const changed = vi.fn();
    const unsubscribe = store.subscribe(changed);
    store.select(destination, 1200, 900, { ...destination, id: "next" });
    const original = store.revision;
    store.select({ ...destination, id: "other" }, 1200, 900);
    expect(store.revision).toBeGreaterThan(original);
    expect(store.current?.id).toBe("other");
    store.clear();
    expect(store.current).toBeUndefined();
    expect(changed).toHaveBeenCalledTimes(3);
    unsubscribe();
    store.clear();
    expect(changed).toHaveBeenCalledTimes(3);
  });
  it("stops speculative tour work without releasing the active destination", () => {
    const store = new NavigationFocusStore();
    store.select(destination, 1200, 900, { ...destination, id: "next" });
    store.stopPrefetch();
    expect(store.current?.id).toBe(destination.id);
    expect(store.current?.next).toBeUndefined();
  });
});

describe("latest destination queue", () => {
  it("replaces queued background work while allowing only one dispatched job", async () => {
    const started: string[] = [];
    let release!: () => void;
    const queue = new LatestQueue<string>(
      async (item) => {
        started.push(item);
        if (item === "running")
          await new Promise<void>((resolve) => {
            release = resolve;
          });
      },
      () => {},
    );
    queue.replace(["running", "obsolete", "background"]);
    queue.replace(["new-destination", "new-surroundings"]);
    expect(started).toEqual(["running"]);
    release();
    await tick();
    expect(started).toEqual(["running", "new-destination", "new-surroundings"]);
  });
  it("continues after failures and drops pending jobs on disposal", async () => {
    const failed = vi.fn();
    const started: number[] = [];
    const queue = new LatestQueue<number>(async (item) => {
      started.push(item);
      if (item === 1) throw Error("worker failure");
      queue.dispose();
    }, failed);
    queue.replace([1, 2, 3]);
    await tick();
    expect(started).toEqual([1, 2]);
    expect(failed).toHaveBeenCalledOnce();
  });
});
