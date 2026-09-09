import { addProtocol } from "maplibre-gl";
import { affectsRunway, correctTerrainPixels } from "./runway-terrain";

// Correct the DEM itself so runways, terrain, hillshade, vehicles, and elevation
// queries all agree. Unaffected tiles pass through without decoding or rewriting.
addProtocol("atlas-terrain", async (params, controller) => {
  const match = /^atlas-terrain:\/\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(params.url);
  if (!match) throw new Error("Invalid terrain tile");
  const [z, x, y] = match.slice(1).map(Number);
  const response = await fetch(
    `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
    { signal: controller.signal },
  );
  if (!response.ok) throw new Error(`Terrain tile: ${response.status}`);
  const data = await response.arrayBuffer();
  if (!affectsRunway(z, x, y)) return { data };
  controller.signal.throwIfAborted();
  const bitmap = await createImageBitmap(new Blob([data]), {
    premultiplyAlpha: "none",
    colorSpaceConversion: "none",
  });
  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d", { willReadFrequently: true })!;
    context.drawImage(bitmap, 0, 0);
    const image = context.getImageData(0, 0, bitmap.width, bitmap.height);
    correctTerrainPixels(image.data, bitmap.width, z, x, y);
    controller.signal.throwIfAborted();
    context.putImageData(image, 0, 0);
    const corrected = await canvas.convertToBlob({ type: "image/png" });
    controller.signal.throwIfAborted();
    return { data: await corrected.arrayBuffer() };
  } finally {
    bitmap.close();
  }
});
