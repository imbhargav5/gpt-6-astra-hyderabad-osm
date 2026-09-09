import { environment } from "./environment";
import { CITY_BOUNDS } from "./city-slab";
import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";
export type Theme = "day" | "sunset" | "night";
export const palettes = {
  day: {
    ground: "#e7e1d3",
    land: "#d8d5c6",
    park: "#b9c7a3",
    water: "#6aabae",
    road: "#f4eee1",
    highway: "#c6aa83",
    building: "#d5cbb9",
    tall: "#9aaeb0",
    text: "#4d6059",
    halo: "#f5f2e8",
    sky: "#dce7e5",
  },
  sunset: {
    ground: "#ddc3aa",
    land: "#d2b69e",
    park: "#b7be98",
    water: "#7aaba7",
    road: "#f9debd",
    highway: "#d69766",
    building: "#e5c4a0",
    tall: "#af876d",
    text: "#634c42",
    halo: "#efd1b0",
    sky: "#ecc4ad",
  },
  night: {
    ground: "#162729",
    land: "#1b3031",
    park: "#315839",
    water: "#234955",
    road: "#59716b",
    highway: "#cbb37b",
    building: "#41615c",
    tall: "#7d9d87",
    text: "#c0cdc3",
    halo: "#172a2b",
    sky: "#172832",
  },
};
export function buildingMaterial(theme: Theme): ExpressionSpecification {
  const c =
    theme === "night"
      ? ["#536763", "#596969", "#716e65", "#65808a", "#64706b"]
      : theme === "sunset"
        ? ["#d8c1a5", "#c9c0b4", "#c59a80", "#a1b6b5", "#ccc4b1"]
        : ["#ded2bc", "#c9cdc7", "#c3a18b", "#9ab2b6", "#d1cbbb"];
  const variant: ExpressionSpecification = [
    "%",
    ["abs", ["to-number", ["id"], ["get", "render_height"], 9]],
    5,
  ];
  return [
    "case",
    [
      "in",
      ["coalesce", ["get", "material"], ["get", "building:material"], ""],
      ["literal", ["brick", "terracotta"]],
    ],
    c[2],
    [">=", ["coalesce", ["get", "render_height"], 9], 65],
    c[3],
    ["match", variant, 0, c[0], 1, c[1], 2, c[2], 3, c[4], c[0]],
  ];
}
export function buildingHeight(multiplier: number): ExpressionSpecification {
  return [
    "*",
    ["max", 3, ["coalesce", ["get", "render_height"], 9]],
    multiplier,
  ];
}
export function createStyle(theme: Theme, height: number): StyleSpecification {
  const c = palettes[theme];
  const lighting = environment[theme];
  return {
    version: 8,
    glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
    sources: {
      osm: {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
        bounds: CITY_BOUNDS,
      },
      terrain: {
        type: "raster-dem",
        bounds: CITY_BOUNDS,
        tiles: [
          "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
        ],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 14,
        attribution:
          '<a href="https://registry.opendata.aws/terrain-tiles/">Terrain: Mapzen / AWS</a>',
      },
      hillshade: {
        type: "raster-dem",
        bounds: CITY_BOUNDS,
        tiles: [
          "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png",
        ],
        encoding: "terrarium",
        tileSize: 256,
        maxzoom: 14,
      },
    },
    sky: {
      "sky-color": c.sky,
      "horizon-color": c.ground,
      "fog-color": lighting.fog,
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.7,
      "fog-ground-blend": 0.22,
      "atmosphere-blend": 0,
    },
    light: {
      anchor: "map",
      color: lighting.color,
      intensity: lighting.intensity,
      position: [1.5, lighting.azimuth, lighting.polar],
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": c.ground },
      },
      {
        id: "landuse",
        type: "fill",
        source: "osm",
        "source-layer": "landuse",
        paint: {
          "fill-color": [
            "match",
            ["get", "class"],
            "residential",
            c.land,
            "industrial",
            theme === "night" ? "#273336" : "#cdc9be",
            "commercial",
            theme === "night" ? "#273836" : "#ddd6c7",
            "cemetery",
            c.park,
            c.land,
          ],
          "fill-opacity": 0.65,
        },
      },
      {
        id: "rock-ground",
        type: "fill",
        source: "osm",
        "source-layer": "landcover",
        filter: ["in", "class", "rock", "bare_rock", "sand"],
        paint: {
          "fill-color":
            theme === "night"
              ? "#303738"
              : theme === "sunset"
                ? "#c5ae98"
                : "#c9beac",
          "fill-opacity": 0.7,
        },
      },
      {
        id: "green",
        type: "fill",
        source: "osm",
        "source-layer": "landcover",
        filter: ["in", "class", "wood", "grass", "scrub"],
        paint: {
          "fill-color":
            theme === "night"
              ? c.park
              : [
                  "match",
                  ["get", "class"],
                  "wood",
                  theme === "sunset" ? "#b9c48c" : "#b3c78f",
                  "scrub",
                  theme === "sunset" ? "#c8c39a" : "#c2c89e",
                  [
                    "match",
                    ["get", "subclass"],
                    "meadow",
                    "#d5dcaf",
                    "grassland",
                    "#cad4a0",
                    "#cbd7a8",
                  ],
                ],
          "fill-opacity": 0.96,
        },
      },
      {
        id: "parks",
        type: "fill",
        source: "osm",
        "source-layer": "park",
        paint: { "fill-color": c.park, "fill-opacity": 0.9 },
      },
      {
        id: "woodland-ground",
        type: "fill",
        source: "osm",
        "source-layer": "landcover",
        filter: ["==", "class", "wood"],
        paint: {
          "fill-color":
            theme === "night"
              ? "#354d38"
              : [
                  "match",
                  ["%", ["abs", ["to-number", ["id"], 0]], 4],
                  0,
                  "#b5c88e",
                  1,
                  "#adc18b",
                  2,
                  "#c0cc99",
                  "#b6c497",
                ],
          "fill-opacity": 0.92,
        },
      },
      {
        id: "land-grain",
        type: "fill",
        source: "osm",
        "source-layer": "landcover",
        filter: ["in", "class", "wood", "grass", "scrub"],
        paint: { "fill-pattern": "land-grain", "fill-opacity": 0.22 },
      },
      {
        id: "hillshade",
        type: "hillshade",
        source: "hillshade",
        paint: {
          "hillshade-method": "standard",
          "hillshade-illumination-anchor": "map",
          "hillshade-illumination-direction": lighting.azimuth,
          "hillshade-exaggeration": 0.38,
          "hillshade-accent-color": theme === "night" ? "#365346" : "#ac9f88",
          "hillshade-shadow-color": theme === "night" ? "#081c25" : "#7a827d",
          "hillshade-highlight-color": theme === "night" ? c.ground : "#f4ecda",
        },
      },
      {
        id: "water",
        type: "fill",
        source: "osm",
        "source-layer": "water",
        paint: { "fill-color": c.water },
      },
      {
        id: "shoreline",
        type: "line",
        source: "osm",
        "source-layer": "water",
        minzoom: 12,
        paint: {
          "line-color": theme === "night" ? "#507173" : "#a8c3b8",
          "line-opacity": 0.65,
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.4, 17, 1.8],
        },
      },
      {
        id: "waterways",
        type: "line",
        source: "osm",
        "source-layer": "waterway",
        paint: {
          "line-color": c.water,
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 0.5, 16, 4],
        },
      },
      {
        id: "runways",
        type: "line",
        source: "osm",
        "source-layer": "aeroway",
        paint: {
          "line-color": c.road,
          "line-width": ["interpolate", ["linear"], ["zoom"], 11, 2, 16, 30],
        },
      },
      {
        id: "roads",
        type: "line",
        source: "osm",
        "source-layer": "transportation",
        filter: ["!in", "class", "rail", "transit", "path"],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": c.road,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            0.3,
            14,
            1.8,
            17,
            6,
          ],
        },
      },
      {
        id: "highways",
        type: "line",
        source: "osm",
        "source-layer": "transportation",
        filter: ["in", "class", "motorway", "trunk", "primary"],
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": c.highway,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            1,
            14,
            2.5,
            17,
            8,
          ],
        },
      },
      {
        id: "rail",
        type: "line",
        source: "osm",
        "source-layer": "transportation",
        filter: ["in", "class", "rail", "transit"],
        paint: {
          "line-color": c.text,
          "line-opacity": 0.4,
          "line-width": 1.2,
          "line-dasharray": [2, 2],
        },
      },
      {
        id: "buildings",
        type: "fill-extrusion",
        source: "osm",
        "source-layer": "building",
        minzoom: 13,
        filter: ["!=", ["get", "hide_3d"], true],
        paint: {
          "fill-extrusion-color": buildingMaterial(theme),
          "fill-extrusion-vertical-gradient": true,
          "fill-extrusion-height": buildingHeight(height),
          "fill-extrusion-base": [
            "*",
            ["coalesce", ["get", "render_min_height"], 0],
            height,
          ],
          "fill-extrusion-opacity": 1,
        },
      },
      {
        id: "water-labels",
        type: "symbol",
        source: "osm",
        "source-layer": "water_name",
        layout: {
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-font": ["Noto Sans Italic"],
          "text-size": 13,
          "text-letter-spacing": 0.08,
        },
        paint: {
          "text-color": c.text,
          "text-halo-color": c.water,
          "text-halo-width": 1,
        },
      },
      {
        id: "place-labels",
        type: "symbol",
        source: "osm",
        "source-layer": "place",
        minzoom: 10,
        filter: [
          "in",
          "class",
          "suburb",
          "quarter",
          "neighbourhood",
          "town",
          "city",
        ],
        layout: {
          "text-field": [
            "upcase",
            ["coalesce", ["get", "name:en"], ["get", "name"]],
          ],
          "text-font": ["Noto Sans Regular"],
          "text-size": ["interpolate", ["linear"], ["zoom"], 10, 10, 16, 14],
          "text-letter-spacing": 0.16,
          "text-max-width": 12,
        },
        paint: {
          "text-color": c.text,
          "text-halo-color": c.halo,
          "text-halo-width": 1.5,
          "text-opacity": 0.85,
        },
      },
      {
        id: "road-labels",
        type: "symbol",
        source: "osm",
        "source-layer": "transportation_name",
        minzoom: 15,
        layout: {
          "symbol-placement": "line",
          "text-field": ["coalesce", ["get", "name:en"], ["get", "name"]],
          "text-font": ["Noto Sans Regular"],
          "text-size": 10,
        },
        paint: {
          "text-color": c.text,
          "text-halo-color": c.halo,
          "text-halo-width": 1.5,
        },
      },
    ],
  };
}
export const layerGroups = {
  buildings: ["buildings"],
  roads: ["roads", "highways", "rail", "runways", "road-labels"],
  water: ["water", "shoreline", "waterways", "water-labels"],
  parks: ["green", "parks", "woodland-ground", "land-grain"],
  labels: ["place-labels"],
};
export type LayerKey = keyof typeof layerGroups;
