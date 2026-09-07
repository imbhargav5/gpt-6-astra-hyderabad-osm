import { CITY_BOUNDS } from "./city-slab";
import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl";
export type Theme = "day" | "sunset" | "night";
export const palettes = {
  day: {
    ground: "#e8e5d9",
    land: "#deddd0",
    park: "#c4d39e",
    water: "#42b4cd",
    road: "#faf7e9",
    highway: "#d3b785",
    building: "#d3cebb",
    tall: "#93a48c",
    text: "#4d6059",
    halo: "#f5f2e8",
    sky: "#e0e9e4",
  },
  sunset: {
    ground: "#ddc3aa",
    land: "#d2b69e",
    park: "#cad09b",
    water: "#55abbc",
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
    water: "#12475b",
    road: "#59716b",
    highway: "#cbb37b",
    building: "#41615c",
    tall: "#7d9d87",
    text: "#c0cdc3",
    halo: "#172a2b",
    sky: "#111e29",
  },
};
export function buildingHeight(multiplier: number): ExpressionSpecification {
  return [
    "*",
    ["max", 3, ["coalesce", ["get", "render_height"], 9]],
    multiplier,
  ];
}
export function createStyle(theme: Theme, height: number): StyleSpecification {
  const c = palettes[theme];
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
      "fog-color": c.sky,
      "sky-horizon-blend": 0.6,
      "horizon-fog-blend": 0.7,
      "fog-ground-blend": 0.35,
      "atmosphere-blend": 0,
    },
    light: {
      anchor: "viewport",
      color: theme === "sunset" ? "#ffdbad" : "#ffffff",
      intensity: theme === "night" ? 0.3 : 0.45,
      position: [1.5, theme === "sunset" ? 110 : 210, 40],
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
        paint: { "fill-color": c.land, "fill-opacity": 0.5 },
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
        paint: { "fill-pattern": "land-grain", "fill-opacity": 0.6 },
      },
      {
        id: "hillshade",
        type: "hillshade",
        source: "hillshade",
        paint: {
          "hillshade-method": "multidirectional",
          "hillshade-exaggeration": 0.8,
          "hillshade-accent-color": theme === "night" ? "#365346" : "#879c69",
          "hillshade-shadow-color": theme === "night" ? "#081c25" : "#647957",
          "hillshade-highlight-color": theme === "night" ? c.ground : "#edf0d5",
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
          "fill-extrusion-color": [
            "interpolate",
            ["linear"],
            ["coalesce", ["get", "render_height"], 9],
            0,
            c.building,
            40,
            c.building,
            100,
            c.tall,
          ],
          "fill-extrusion-height": buildingHeight(height),
          "fill-extrusion-base": [
            "*",
            ["coalesce", ["get", "render_min_height"], 0],
            height,
          ],
          "fill-extrusion-opacity": 0.95,
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
  water: ["water", "waterways", "water-labels"],
  parks: ["green", "parks", "woodland-ground", "land-grain"],
  labels: ["place-labels"],
};
export type LayerKey = keyof typeof layerGroups;
