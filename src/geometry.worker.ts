import { createPlaceModels } from "./place-geometry";
import { createFlyoverMesh } from "./flyover-geometry";
import { buildLandmarkDetails } from "./landmark-geometry";
self.onmessage = ({ data: { sequence, job } }) => {
  try {
    let result;
    if (job.kind === "place")
      result = createPlaceModels().find((model) => model.id === job.id)!.mesh;
    else if (job.kind === "architecture")
      result = buildLandmarkDetails(job.buildings, job.center, job.focus);
    else if (job.kind === "flyover") {
      const elevations = new Map<string, number | null>(job.elevations);
      result = createFlyoverMesh(
        job.data,
        job.height,
        (p) => elevations.get(p.join(",")) ?? null,
        job.center,
        Infinity,
        new Map(job.profiles),
      );
    } else throw new Error("Unknown geometry job");
    if (result instanceof Float32Array)
      self.postMessage({ sequence, result }, { transfer: [result.buffer] });
    else self.postMessage({ sequence, result });
  } catch (error) {
    self.postMessage({ sequence, error: String(error) });
  }
};
