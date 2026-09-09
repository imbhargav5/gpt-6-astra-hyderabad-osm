import type { LayerKey, Theme } from "./map-style";
export const SETTINGS_KEY = "hyderabad-atlas:map-settings:v1";
export interface MapSettings {
  theme: Theme;
  height: number;
  terrain: number;
  terrainOn: boolean;
  traffic: boolean;
  layers: Record<LayerKey, boolean>;
}
const defaults = (): MapSettings => ({
  theme: "day",
  height: 1.5,
  terrain: 1.5,
  terrainOn: true,
  traffic: true,
  layers: {
    buildings: true,
    roads: true,
    water: true,
    parks: true,
    labels: true,
  },
});
function slider(value: unknown, max: number, fallback: number): number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 1 &&
    value <= max
    ? Math.round(value * 2) / 2
    : fallback;
}
export function readMapSettings(
  storage?: Pick<Storage, "getItem">,
): MapSettings {
  const settings = defaults();
  try {
    const value = JSON.parse(
      (storage ?? window.localStorage).getItem(SETTINGS_KEY) ?? "null",
    );
    if (!value || typeof value !== "object" || Array.isArray(value))
      return settings;
    if (["day", "sunset", "night"].includes(value.theme))
      settings.theme = value.theme;
    if (typeof value.traffic === "boolean") settings.traffic = value.traffic;
    settings.height = slider(value.height, 4, settings.height);
    settings.terrain = slider(value.terrain, 6, settings.terrain);
    if (typeof value.terrainOn === "boolean")
      settings.terrainOn = value.terrainOn;
    for (const key of Object.keys(settings.layers) as LayerKey[]) {
      if (typeof value.layers?.[key] === "boolean")
        settings.layers[key] = value.layers[key];
    }
  } catch {
    /* Unavailable storage or invalid saved data should never block the map. */
  }
  return settings;
}
export function writeMapSettings(
  settings: MapSettings,
  storage?: Pick<Storage, "setItem">,
): void {
  try {
    (storage ?? window.localStorage).setItem(
      SETTINGS_KEY,
      JSON.stringify(settings),
    );
  } catch {
    /* Keep controls usable when browser storage is blocked or full. */
  }
}
