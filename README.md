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
- 27 searchable, curated places and category filters.
- An eight-stop guided fly-through: Charminar → Golconda → Hussain Sagar → Jubilee Hills → HITEC City → Financial District → Kokapet → Gandipet.
- Tour pause/resume, previous/next stops, and cancellation on manual map navigation.
- In 3D, left-drag orbits and tilts around the map centre; right-drag, Shift + left-drag, or Space + left-drag pans. In 2D, left-drag also pans. Native touch gestures remain available.
- Map settings (layer visibility, building/terrain exaggeration, terrain relief and lighting mode) are saved in browser localStorage and restored on reload.
- Individual layer controls, building-height exaggeration, 2D/3D toggle, compass, zoom and reset.
- Responsive mobile place picker, touch gestures, keyboard controls, reduced-motion support, shareable camera URLs, and loading/error states.

## Bounded city view

Zoom out or use **View entire city** (the expand icon) to see the rectangular Hyderabad terrain slab against an empty background. The display crop is 78.23–78.63° E, 17.20–17.575° N; it includes every curated landmark and is not an official boundary. Camera zoom can reach level 8 and is no longer forced inside geographic max bounds.

The map canvas is clipped to the terrain-sampled perimeter using the renderer's camera matrix, with a projected base below it. Rounded corners, a narrow upper bevel, a lower chamfer, smoothly varying side tones and a soft contact shadow give the base a finished edge; materials adapt to the lighting theme. Homogeneous clipping handles edges passing behind the camera when zooming into the city. Exterior map pixels are hidden; tile requests are limited to tiles overlapping the crop, although boundary tiles can contain geometry outside it. The base is a visual plinth, not a geological cross-section. Upstream vector tiles simplify detail at distant zooms, so individual buildings appear when zoomed in.

## Data and representation

**Map geometry:** [OpenFreeMap](https://openfreemap.org/quick_start/) serves vector tiles in the [OpenMapTiles](https://openmaptiles.org/) schema, based on [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), licensed under ODbL. Attribution stays visible on the map. The `/planet` endpoint tracks the provider's current data, so this is not a frozen, reproducible snapshot.

**Buildings:** Use the tiles' `render_height` and `render_min_height` fields. OpenMapTiles may derive heights from OSM heights or levels, or supply estimates. Missing render heights fall back to 9 m; the visible extrusion is at least 3 m before exaggeration. Defaults are ×2 for buildings and ×2.5 for terrain. This app does not claim a verified citywide building count or survey-grade heights. Buildings appear at zoom 13 and above, depending on tile coverage.

**Terrain:** [AWS Terrain Tiles / Mapzen](https://registry.opendata.aws/terrain-tiles/) combines SRTM and other elevation sources; consult its dataset documentation for source-specific attribution. DEM requests are capped at zoom 14 for finer terrain rendering near hills; underlying elevation accuracy remains limited by the source DEM. Multidirectional hillshading and sky/fog improve depth cues. The “Explore the Deccan hills” preset frames Golconda at a low viewing angle with ×4 terrain exaggeration; the slider supports ×1–6. Separate DEM sources are used for hillshading and terrain, as recommended by the renderer.

**Landmarks:** Curated approximate camera locations and editorial descriptions. An illustrative architectural layer adds roof coping, projecting cornices, floor bands, arched windows and pilasters to mapped heritage footprints, and glazed panels, mullions and roof trim to major modern footprints. It covers Golconda, Cyber Towers, Financial District, Kokapet, T-Hub, Secretariat, Chowmahalla, Mecca Masjid, Falaknuma and the airport terminal area. Selection uses proximity and minimum footprint area; it is not a verified inventory of buildings within each campus. Natural stops remain untouched. Cyber Towers is centered on the mapped [office footprint](https://www.openstreetmap.org/way/68883448), and T-Hub on the live tiles’ T-Hub Phase 2 POI.

Charminar has a separate procedural model with crossing passage arches, an open upper arcade, four tiered minarets, balcony rings and domed crowns. Its placement/orientation follow the mapped footprint; the four minarets and arched form are informed by [Telangana Tourism](https://www.tourism.telangana.gov.in/attractions/charminar). The corresponding generic tile extrusions are suppressed within a tightly bounded footprint. Ornament and proportions are illustrative, not measured architectural reconstructions. [Taj's Falaknuma gallery](https://www.tajhotels.com/en-in/hotels/taj-falaknuma-palace-hyderabad/gallery) and [Chowmahalla Palace](https://www.chowmahalla.in/) informed the heritage detailing vocabulary.

Details retain mapped courtyard holes, follow the native terrain renderer, scale with building exaggeration, change materials with lighting, and follow the Buildings visibility toggle. Fine façades appear at zoom 15.5; roof silhouettes and Charminar appear from zoom 13. Geometry is generated after OSM tiles arrive and the camera settles, deduplicates tile features, and is capped at 36 mapped footprint parts and 8,000 detail polygons per loaded view. Cornices, windows and battlements are artistic interpretation, not new OSM observations. No official ward boundaries or flood-risk simulation are claimed.

The app streams visible tiles instead of running citywide Overpass queries or loading all buildings into JavaScript. Coverage depends on upstream mapping; newly constructed areas may be sparse or out of date. The app is a city exploration experience, not a navigation, engineering or emergency-response tool.

## Project layout

- `src/App.tsx` — map lifecycle, controls, tour and responsive interface.
- `src/map-style.ts` — map sources, styles, height expression and layer groups.
- `src/landmarks.ts` — curated places, tour sequence and search.
- `src/landmark-detail.ts` — footprint-based architectural detailing and map lifecycle.
- `src/charminar.ts` — illustrative monument geometry and replacement footprint.
- `src/styles.css` — responsive layout and day/sunset/night UI palettes.
- `src/map.test.ts` — real MapLibre style validation and core data checks.

## Woodland rendering

A batched custom WebGL layer renders faceted cone trees only inside `landcover` polygons with `class=wood` (OSM woodland/forest). Grass, scrub and generic parks stay as colored ground and do not generate trees. Polygon holes, mapped water, buildings and a buffer around roads/rail/runways exclude tree candidates. Tree locations use deterministic patches of varying density, with independent variation in canopy height, width and foliage hue. Terrain-following contact shadows and distance haze integrate them into the landscape. Tree positions are not surveyed individual trees; density and symbol scale adapt to zoom, with a maximum of 8,000 trees per view. Trees follow terrain elevation and the greenery visibility control. Woodland, meadow, grass and scrub have distinct muted green tones, with low-contrast seamless surface grain and stronger hill shading. Foliage spans deep green, olive and pale sunlit greens; water stays cyan-blue. Texture and foliage variation are artistic styling, not additional land-cover observations.

This is **not satellite canopy detection**: areas without woodland polygons in the provider's current tiles remain empty of tree symbols. At distant zooms, upstream polygons are simplified. Generation runs after the view and sources settle; tree counts indicate illustrative symbols, not an inventory of real trees.

## Next extensions

The current map is a runnable first version of the atlas in the project context. Further work could add surveyed landmark models, verified municipal boundaries, a pinned/self-hosted tile dataset, and an offline preprocessing pipeline. A credible flood model would additionally require validated drainage, rainfall, terrain resolution and hydrologic calibration; visual terrain alone is insufficient.

## Buddha statue

The Hussain Sagar landmark has a dedicated, procedurally sculpted WebGL mesh: raised hand and fingers, facial features, elongated earlobes, carved hair and crown, robe pleats, feet, and a stepped lotus pedestal. It is an illustrative interpretation of the [standing Buddha on Hussain Sagar](https://hyderabad.telangana.gov.in/tourist-place/hussain-sagar-lake/), not a photogrammetry scan. The model is centered on the mapped statue footprint; the old pedestal/statue extrusions are excluded by their footprint-derived IDs without removing the island. The landmark camera now opens closer to the sculpture.

The mesh uses 26,840 triangles, is uploaded once, follows the island terrain elevation, and adopts day, sunset and night stone lighting. Building exaggeration scales the sculpture proportionately, and the Buildings switch hides it. Fine facial geometry uses local meter coordinates to preserve precision at close zoom. GPU resources are released when the map is removed. No external model or texture download is required.

## Additional landmarks

The place picker includes Birla Mandir, B. M. Birla Planetarium, Nehru Zoological Park, Durgam Cheruvu Cable Bridge, Chilkur Balaji Temple, Shri Jagannath Swami Temple, Gurdwara Sahib Secunderabad (Regimental Bazaar), Secunderabad Clock Tower, Parade Grounds, Gymkhana Grounds and Chanchalguda Central Jail. Each has a marker, category, description and camera view. Alternate names and common spelling variants are searchable. The cable bridge has its own entry, separate from the lake; the existing eight-stop guided tour is retained.

Camera positions were checked against live OpenFreeMap OSM POIs and mapped features, including [Parade Grounds](https://www.openstreetmap.org/way/29252455), [Durgam Cheruvu Bridge](https://www.openstreetmap.org/way/761604461), [Chilkur Balaji Temple](https://www.openstreetmap.org/way/225880080), and the [Regimental Bazaar gurdwara listing](https://gurdwaras.com/gurdwara/gurdwara-sahib-secunderabad-23d8d6e0). These additions now include illustrative architectural models and mapped campus details (described below). All fit within the existing city crop.

### Detailed models for the additional places

Birla Mandir has a marble terrace, ribbed roof towers, shrines, steps and balustrades; Birla Planetarium has a ribbed dome and entrance. Chilkur has a tiered gateway and colonnades; Jagannath has terracotta towers, roof tiers and niches; the Secunderabad gurdwara has onion domes, corner pavilions and a flagpole. The clock tower has masonry courses, four clock faces, dial ticks, hands and a cupola. Durgam Cheruvu Bridge has a deck aligned to its mapped footprint, pylons, fan cables, railings, lane markings and lamps.

The zoo has enhanced mapped footpaths, perimeter coping, building façades and an illustrative entrance near the northeast visitor parking area (its placement is approximate). Parade Grounds has a defined earth surface, mapped paths, perimeter coping and nearby building detailing. Gymkhana has mapped cricket/court outlines, mowing bands, a cricket strip and crease/court markings. Chanchalguda has a wall following its public mapped perimeter and footprint-based building façades. Trees remain restricted to mapped tree cover.

These are procedural artistic interpretations, not surveyed architectural reconstructions. Decorative heights, roof forms, sports markings and gateway details are illustrative; clock hands are fixed. Campus outlines and available paths come from OpenStreetMap ways [27937605 (zoo)](https://www.openstreetmap.org/way/27937605), [29252455 (Parade)](https://www.openstreetmap.org/way/29252455), [29252465 (Gymkhana)](https://www.openstreetmap.org/way/29252465), and [238281779 (jail)](https://www.openstreetmap.org/way/238281779), with nearby mapped sport areas. Data © OpenStreetMap contributors, ODbL; snapshot retrieved September 2026.

`place-models.ts` shares one GPU buffer across models and draws nearby sites from zoom 13; building visibility, height exaggeration, terrain and lighting settings apply. `place-surfaces.ts` uses terrain-draped native layers. Mesh, coverage, replacement-containment and campus-boundary checks are in `place-detail.test.ts`.

### Malls, hospitals and additional campuses

The atlas now has 39 searchable places. The latest twelve are Inorbit Mall, GVK One, L. V. Prasad Eye Institute (Banjara Hills), Gandhi Hospital, Sarath City Capital Mall, Biodiversity Park, Begumpet Airport, DRDO/DRDL Kanchanbagh, BDL Kanchanbagh, MIDHANI Township, Hakimpet Air Force Station and TCS Adibatla. Existing marker numbers and the eight-stop tour remain stable.

Mapped mall/office footprints receive glazing, fins, floor bands and roof detailing; hospitals use smaller window grids and projecting sunshades; industrial footprints use roof seams; township buildings use window and balcony bands. These are illustrative treatments of available map geometry, not replicas or a verified building inventory. Architectural geometry is generated when relevant vector tiles arrive. Public campus boundaries constrain selection where available; DRDL, BDL and MIDHANI use approximate camera locations and proximity selection. BDL's camera is an approximate Kanchanbagh precinct view.

Biodiversity Park has its mapped outline, path detailing and a planted-area fill. Airport runways, aprons and taxiways follow public OSM geometry. Runway markings are illustrative, and a centreline-only runway receives an assumed 45 m display width. Airfield surfaces follow the roads visibility setting; park surfaces follow greenery. The city crop now extends to 17.575° N to comfortably include Hakimpet.

Geometry snapshot: OpenStreetMap © contributors (ODbL), September 2026, including ways [68871414 (Inorbit)](https://www.openstreetmap.org/way/68871414), [75364216 (GVK)](https://www.openstreetmap.org/way/75364216), [660771331 (LVPEI)](https://www.openstreetmap.org/way/660771331), [319567708 (Gandhi)](https://www.openstreetmap.org/way/319567708), [574673965 (Sarath City)](https://www.openstreetmap.org/way/574673965), [543750079 (Biodiversity Park)](https://www.openstreetmap.org/way/543750079), [32431627 (Begumpet)](https://www.openstreetmap.org/way/32431627), [475941771 (Hakimpet)](https://www.openstreetmap.org/way/475941771), and [1443195995 (TCS)](https://www.openstreetmap.org/way/1443195995). The [BDL public address](https://www.ddpmod.gov.in/en/node/440) identifies Kanchanbagh; the [TCS construction project page](https://www.shapoorjipallonji.com/project/TCS-Adibatla) identifies the Adibatla office complex.

### Elevated roads and expressways

Flyovers now render as raised road decks with asphalt surfaces, edge barriers, lane dashes, columns and pier caps. A checked-in OSM snapshot covers 65 road segments around PV Narasimha Rao Expressway, Biodiversity Levels 1 and 2, Kothaguda–Kondapur, Begumpet Airport, APJ Abdul Kalam and other crossings. Live `transportation` tiles extend this to other motorway/trunk/primary/secondary/tertiary features tagged `brunnel=bridge` as you explore. Surface expressway sections remain at ground level. The dedicated Durgam Cheruvu cable bridge model is retained without a second deck.

Roads & rail visibility controls these structures. Heights follow the height setting, mapped layer order separates stacked crossings, terrain provides ground elevation, and materials follow Day/Sunset/Night. Deck height (7 m for the first level), 45 m pier spacing, fallback lane widths and decorative markings are illustrative. Ramp gradients, actual structural clearances and pier positions are not surveyed reconstructions. Ground-level traffic symbols exclude bridge routes to avoid drawing cars beneath their elevated decks.

Source: OpenStreetMap © contributors, ODbL, September 2026; public OSM map extracts along the expressway corridor and campus areas. For example, [PV Narasimha Rao way 375637984](https://www.openstreetmap.org/way/375637984). Dynamic coverage follows the [OpenMapTiles transportation schema](https://openmaptiles.org/schema/#transportation), so missing bridge tags can leave a crossing flat. Geometry budget: 60,000 generated polygons; piers and lane markings appear from zoom 14, decks from zoom 12.
