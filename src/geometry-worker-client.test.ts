import { afterEach, describe, expect, it, vi } from "vitest";
import { GeometryWorker } from "./geometry-worker-client";
class FakeWorker {
  static instance: FakeWorker;
  onmessage?: (event: { data: object }) => void;
  onerror?: (event: { message: string }) => void;
  postMessage = vi.fn();
  terminate = vi.fn();
  constructor() {
    FakeWorker.instance = this;
  }
}
afterEach(() => vi.unstubAllGlobals());
describe("background geometry lifecycle", () => {
  it("matches out-of-order replies to the correct requests", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const worker = new GeometryWorker();
    const first = worker.run({ kind: "place", id: "a" });
    const second = worker.run({ kind: "place", id: "b" });
    FakeWorker.instance.onmessage!({ data: { sequence: 2, result: "b" } });
    FakeWorker.instance.onmessage!({ data: { sequence: 1, result: "a" } });
    expect(await first).toBe("a");
    expect(await second).toBe("b");
    worker.dispose();
  });
  it("rejects pending work and terminates workers when the map is removed", async () => {
    vi.stubGlobal("Worker", FakeWorker);
    const worker = new GeometryWorker();
    const pending = worker.run({ kind: "place" });
    const rejected = expect(pending).rejects.toThrow("disposed");
    worker.dispose();
    await rejected;
    expect(FakeWorker.instance.terminate).toHaveBeenCalledOnce();
  });
});
