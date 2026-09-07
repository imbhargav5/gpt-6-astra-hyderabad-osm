# Hyderabad Atlas

An interactive 3D atlas of Hyderabad, from the Old City to the western technology corridor. Built with React, TypeScript, Vite and MapLibre GL JS.

## Run locally

Requires Node.js 22.12+ (Node 24 recommended).

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite. No API keys, account, database or regional OSM download are required. Internet access and a WebGL2-capable browser are required for the live map. Enable hardware acceleration for best performance.

```sh
npm test        # map styles, height expressions and landmark navigation
npm run build  # strict TypeScript check and production bundle
npm run preview
```

Deploy the generated `dist/` directory to any static host. The camera is stored in the URL fragment; no server-side routing is needed. If deploying under a repository subpath, configure Vite's `base` accordingly.

## Included

- Real OSM building footprints extruded in 3D; roads, rail, parks, lakes and waterways.
- Real terrain from Mapzen / AWS Terrarium elevation tiles, with adjustable exaggeration.
- Day, sunset and night palettes, changed in place without reloading map data.
- 16 searchable, curated places and category filters.
- An eight-stop guided fly-through: Charminar → Golconda → Hussain Sagar → Jubilee Hills → HITEC City → Financial District → Kokapet → Gandipet.
- Tour pause/resume, previous/next stops, and cancellation on manual map navigation.
- In 3D, left-drag orbits and tilts around the map centre; right-drag, Shift + left-drag, or Space + left-drag pans. In 2D, left-drag also pans. Native touch gestures remain available.
- Map settings (layer visibility, building/terrain exaggeration, terrain relief and lighting mode) are saved in browser localStorage and restored on reload.
- Individual layer controls, building-height exaggeration, 2D/3D toggle, compass, zoom and reset.
- Responsive mobile place picker, touch gestures, keyboard controls, reduced-motion support, shareable camera URLs, and loading/error states.

## Bounded city view

Zoom out or use **View entire city** (the expand icon) to see the rectangular Hyderabad terrain slab against an empty background. The display crop is 78.23–78.63° E, 17.20–17.56° N; it includes every curated landmark and is not an official boundary. Camera zoom can reach level 8 and is no longer forced inside geographic max bounds.

The map canvas is clipped to the terrain-sampled perimeter using the renderer's camera matrix, with a projected base below it. Rounded corners, a narrow upper bevel, a lower chamfer, smoothly varying side tones and a soft contact shadow give the base a finished edge; materials adapt to the lighting theme. Homogeneous clipping handles edges passing behind the camera when zooming into the city. Exterior map pixels are hidden; tile requests are limited to tiles overlapping the crop, although boundary tiles can contain geometry outside it. The base is a visual plinth, not a geological cross-section. Upstream vector tiles simplify detail at distant zooms, so individual buildings appear when zoomed in.

## Data and representation

**Map geometry:** [OpenFreeMap](https://openfreemap.org/quick_start/) serves vector tiles in the [OpenMapTiles](https://openmaptiles.org/) schema, based on [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licensed under ODbL. Attribution stays visible on the map. The `/planet` endpoint tracks the provider's current data, so this is not a frozen, reproducible snapshot.

**Buildings:** Use the tiles' `render_height` and `render_min_height` fields. OpenMapTiles may derive heights from OSM heights or levels, or supply estimates. Missing render heights fall back to 9 m; the visible extrusion is at least 3 m before exaggeration. Defaults are ×2 for buildings and ×2.5 for terrain. This app does not claim a verified citywide building count or survey-grade heights. Buildings appear at zoom 13 and above, depending on tile coverage.

**Terrain:** [AWS Terrain Tiles / Mapzen](https://registry.opendata.aws/terrain-tiles/) combines SRTM and other elevation sources; consult its dataset documentation for source-specific attribution. DEM requests are capped at zoom 14 for finer terrain rendering near hills; underlying elevation accuracy remains limited by the source DEM. Multidirectional hillshading and sky/fog improve depth cues. The “Explore the Deccan hills” preset frames Golconda at a low viewing angle with ×4 terrain exaggeration; the slider supports ×1–6. Separate DEM sources are used for hillshading and terrain, as recommended by the renderer.

**Landmarks:** Curated approximate camera locations and editorial descriptions. These are markers and mapped building footprints, not custom architectural reconstructions. No official ward boundaries or flood-risk simulation are claimed.

The app streams visible tiles instead of running citywide Overpass queries or loading all buildings into JavaScript. Coverage depends on upstream mapping; newly constructed areas may be sparse or out of date. The app is a city exploration experience, not a navigation, engineering or emergency-response tool.

## Project layout

- `src/App.tsx` — map lifecycle, controls, tour and responsive interface.
- `src/map-style.ts` — map sources, styles, height expression and layer groups.
- `src/landmarks.ts` — curated places, tour sequence and search.
- `src/styles.css` — responsive layout and day/sunset/night UI palettes.
- `src/map.test.ts` — real MapLibre style validation and core data checks.

## Woodland rendering

A batched custom WebGL layer renders faceted cone trees only inside `landcover` polygons with `class=wood` (OSM woodland/forest). Grass, scrub and generic parks stay as colored ground and do not generate trees. Polygon holes, mapped water, buildings and a buffer around roads/rail/runways exclude tree candidates. Tree locations use deterministic patches of varying density, with independent variation in canopy height, width and foliage hue. Terrain-following contact shadows and distance haze integrate them into the landscape. Tree positions are not surveyed individual trees; density and symbol scale adapt to zoom, with a maximum of 8,000 trees per view. Trees follow terrain elevation and the greenery visibility control. Woodland, meadow, grass and scrub have distinct muted green tones, with low-contrast seamless surface grain and stronger hill shading. Foliage spans deep green, olive and pale sunlit greens; water stays cyan-blue. Texture and foliage variation are artistic styling, not additional land-cover observations.

This is **not satellite canopy detection**: areas without woodland polygons in the provider's current tiles remain empty of tree symbols. At distant zooms, upstream polygons are simplified. Generation runs after the view and sources settle; tree counts indicate illustrative symbols, not an inventory of real trees.

## Next extensions

The current map is a runnable first version of the atlas in the project context. Further work could add bespoke landmark models, verified municipal boundaries, a pinned/self-hosted tile dataset, and an offline preprocessing pipeline. A credible flood model would additionally require validated drainage, rainfall, terrain resolution and hydrologic calibration; visual terrain alone is insufficient.
