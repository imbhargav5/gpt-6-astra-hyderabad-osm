export class GeometryWorker {
  private worker = new Worker(
    new URL("./geometry.worker.ts", import.meta.url),
    { type: "module" },
  );
  private sequence = 0;
  private failure: Error | undefined;
  private pending = new Map<
    number,
    { resolve: (value: unknown) => void; reject: (error: Error) => void }
  >();
  constructor() {
    this.worker.onmessage = ({ data }) => {
      const request = this.pending.get(data.sequence);
      if (!request) return;
      this.pending.delete(data.sequence);
      if (data.error) request.reject(new Error(data.error));
      else request.resolve(data.result);
    };
    this.worker.onerror = (event) => this.fail(new Error(event.message));
  }
  run<T>(job: object): Promise<T> {
    if (this.failure) return Promise.reject(this.failure);
    const sequence = ++this.sequence;
    return new Promise<T>((resolve, reject) => {
      this.pending.set(sequence, {
        resolve: (value) => resolve(value as T),
        reject,
      });
      try {
        this.worker.postMessage({ sequence, job });
      } catch (error) {
        this.pending.delete(sequence);
        reject(error);
      }
    });
  }
  private fail(error: Error) {
    this.failure = error;
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }
  dispose() {
    this.worker.terminate();
    this.fail(new Error("Geometry worker disposed"));
  }
}
