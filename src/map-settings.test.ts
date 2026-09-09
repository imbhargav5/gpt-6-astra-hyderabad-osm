import { describe, expect, it } from "vitest";
import {
  readMapSettings,
  writeMapSettings,
  SETTINGS_KEY,
} from "./map-settings";
describe("saved map preferences", () => {
  it("round trips disabled layers, relief and non-default sliders", () => {
    const data = new Map<string, string>();
    const storage = {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => {
        data.set(key, value);
      },
    };
    const preferences = {
      ...readMapSettings(storage),
      theme: "night" as const,
      height: 3.5,
      terrain: 5,
      terrainOn: false,
    };
    preferences.layers.water = false;
    preferences.layers.buildings = false;
    writeMapSettings(preferences, storage);
    expect(data.has(SETTINGS_KEY)).toBe(true);
    expect(readMapSettings(storage)).toEqual(preferences);
  });
  it("falls back safely for malformed, partial and out-of-range values", () => {
    expect(readMapSettings({ getItem: () => "{bad" }).height).toBe(1.5);
    const restored = readMapSettings({
      getItem: () =>
        JSON.stringify({
          height: 100,
          terrain: -1,
          theme: "invalid",
          layers: { water: false, roads: "false" },
        }),
    });
    expect(restored.height).toBe(1.5);
    expect(restored.terrain).toBe(1.5);
    expect(restored.theme).toBe("day");
    expect(restored.layers.water).toBe(false);
    expect(restored.layers.roads).toBe(true);
  });
  it("does not break the map when browser storage is unavailable", () => {
    const settings = readMapSettings({
      getItem: () => {
        throw new Error("blocked");
      },
    });
    expect(settings.height).toBe(1.5);
    expect(() =>
      writeMapSettings(settings, {
        setItem: () => {
          throw new Error("full");
        },
      }),
    ).not.toThrow();
  });
});
