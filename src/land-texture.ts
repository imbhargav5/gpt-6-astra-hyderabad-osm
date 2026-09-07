import { patchNoise } from "./forest-geometry";
/** A seamless, low-contrast cartographic surface texture; not additional land-cover data. */
export function landTexture() {
  const width = 256,
    height = 256,
    data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      // Crossfade edges so repeats have no seams.
      const noise = (u: number, v: number) =>
        patchNoise(u / 46, v / 46) * 0.7 + patchNoise(u / 13, v / 13) * 0.3;
      const tx = x / width,
        ty = y / height;
      const value =
        noise(x, y) * (1 - tx) * (1 - ty) +
        noise(x - width, y) * tx * (1 - ty) +
        noise(x, y - height) * (1 - tx) * ty +
        noise(x - width, y - height) * tx * ty;
      const i = (y * width + x) * 4;
      const light = value > 0.5;
      data[i] = light ? 239 : 73;
      data[i + 1] = light ? 234 : 96;
      data[i + 2] = light ? 194 : 48;
      data[i + 3] = Math.round(Math.abs(value - 0.5) * 150);
    }
  return { width, height, data };
}
