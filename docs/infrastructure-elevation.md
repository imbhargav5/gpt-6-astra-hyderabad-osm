# Infrastructure elevation corrections

Runway centreline geometry was retrieved from OpenStreetMap on 2026-09-09 via
Overpass (`way[aeroway=runway](17.1,78.2,17.65,78.65);out geom;`). OSM way IDs
are retained in `src/data/runway-profiles.json`. Geometry is © OpenStreetMap
contributors, ODbL: https://www.openstreetmap.org/copyright.

The runway grades are visual estimates, **not surveyed airport elevations**.
`scripts/build-runway-profiles.py` samples 21 points along each centreline from
Mapzen/AWS Terrarium tiles at zoom 14 and fits a linear grade, capped at 1%.
RGIA's two parallel runways use a common longitudinal plane. The script requires
Python and Pillow and runs from the repository root. The source DEM attribution
is https://github.com/tilezen/joerd/blob/master/docs/attribution.md.

Measured raw height ranges before correction:

| Runway OSM ID | Terrain range (m, unexaggerated) |
| --- | --- |
| 28113198 (Begumpet) | 520.35–542.15 |
| 55834635 (RGIA south) | 597.08–625.88 |
| 55842437 (RGIA north) | 591.99–628.25 |
| 198403990 (Hakimpet) | 605.96–622.48 |

`atlas-terrain://` passes unaffected source tiles through unchanged. For tiles
intersecting a runway corridor, it rewrites Terrarium pixels to the fitted grade
within the runway/shoulder width and blends back to the original DEM over 140 m.
Both terrain and hillshade use the corrected source. This also keeps MapLibre's
terrain-draped aeroways and elevation queries consistent; a floating overlay
would leave the original bumpy terrain intersecting the runway.

Flyovers use shared centreline elevation nodes, rather than individually sampled
polygon corners. A maximum-envelope graph traversal bounds longitudinal node
grades to 4% while preserving clearance above centreline terrain samples. All
connected route parts and GPU chunks use the same node elevations, with eased
interpolation between them. Only pier footings sample local ground. Building
height exaggeration no longer scales bridge clearance, deck thickness, barriers,
or piers; terrain exaggeration still determines the ground's displayed height.

These are plausible visual profiles. Actual bridge elevations, banking, approach
ramps, and surveyed runway profiles require better infrastructure-specific data.
The existing estimated bridge layer clearances remain 7 m + 6 m per extra layer.
