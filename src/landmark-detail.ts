import {
  NavigationFocusStore,
  LatestQueue,
  distanceMeters,
} from "./navigation-focus";
import { plainFeature } from "./spatial-stream";
import { GeometryWorker } from "./geometry-worker-client";
import { DETAIL_SOURCE, DETAIL_LAYERS } from "./landmark-geometry";
export {
  buildLandmarkDetails,
  detailSites,
  MAX_DETAILS,
  DETAIL_SOURCE,
  DETAIL_LAYERS,
} from "./landmark-geometry";
type Building = Feature<Polygon | MultiPolygon>;
import { PLACE_MODELS, placeReplacementIds } from "./place-models";
import { buddhaReplacementIds } from "./buddha";
import { charminarReplacementIds } from "./charminar";
import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
} from "geojson";
import type {
  GeoJSONSource,
  Map,
  MapSourceDataEvent,
  ExpressionSpecification,
} from "maplibre-gl";
import type { Theme } from "./map-style";

export function detailColors(theme: Theme): ExpressionSpecification {
  const colors =
    theme === "night"
      ? ["#637c71", "#87998a", "#bcaa73", "#759d9f", "#324e4e", "#b8bba1"]
      : theme === "sunset"
        ? ["#c4a886", "#f0d9b6", "#796b5c", "#829c9b", "#9c998c", "#d5c7a8"]
        : ["#c5c0ab", "#eee9d7", "#7c8277", "#87a9aa", "#a4aeaa", "#cbd4c9"];
  return [
    "match",
    ["get", "material"],
    "stone",
    colors[0],
    "trim",
    colors[1],
    "recess",
    colors[2],
    "glass",
    colors[3],
    "roof",
    colors[4],
    colors[5],
  ];
}

type Settings = { height: number; theme: Theme; visible: boolean };
export function applyLandmarkDetailSettings(map: Map, settings: Settings) {
  for (const id of DETAIL_LAYERS)
    if (map.getLayer(id)) {
      map.setLayoutProperty(
        id,
        "visibility",
        settings.visible ? "visible" : "none",
      );
      map.setPaintProperty(id, "fill-extrusion-height", [
        "*",
        ["get", "top"],
        settings.height,
      ]);
      map.setPaintProperty(id, "fill-extrusion-base", [
        "*",
        ["get", "base"],
        settings.height,
      ]);
      map.setPaintProperty(
        id,
        "fill-extrusion-color",
        detailColors(settings.theme),
      );
    }
}

export function installLandmarkDetails(
  map: Map,
  settings: () => Settings,
  navigation = new NavigationFocusStore(),
) {
  const worker = new GeometryWorker();
  let removed = false,
    revision = 0;
  let signature = "";
  const excludedIds = new Set<string | number>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let dirty = true;
  const install = () => {
    revision++;
    if (map.getSource(DETAIL_SOURCE)) return;
    map.addSource(DETAIL_SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      maxzoom: 19,
      tolerance: 0,
    });
    DETAIL_LAYERS.forEach((id, fine) =>
      map.addLayer(
        {
          id,
          type: "fill-extrusion",
          source: DETAIL_SOURCE,
          minzoom: fine ? 15.5 : 13,
          filter: ["==", ["get", "fine"], fine],
          paint: {
            "fill-extrusion-opacity": 1,
            "fill-extrusion-vertical-gradient": true,
          },
        },
        "water-labels",
      ),
    );
    signature = "";
    excludedIds.clear();
    dirty = true;
    applyLandmarkDetailSettings(map, settings());
  };
  const rebuild = async () => {
    const current = revision;
    if (!dirty || !map.getSource(DETAIL_SOURCE) || !settings().visible) return;
    const focus = navigation.current;
    const navigationRevision = navigation.revision;
    dirty = false;
    const buildings = map
      .querySourceFeatures("osm", { sourceLayer: "building" })
      .filter(
        (f) =>
          f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon",
      ) as Building[];
    const previousIds = [...excludedIds].join(",");
    excludedIds.clear();
    const uploadedModels = new Set(
      (map.getContainer().dataset.detailedModels ?? "").split(","),
    );
    for (const id of [
      ...(signature ? charminarReplacementIds(buildings) : []),
      ...buddhaReplacementIds(buildings),
      ...placeReplacementIds(
        buildings,
        PLACE_MODELS.filter((model) => uploadedModels.has(model.id)),
      ),
    ])
      excludedIds.add(id);
    if ([...excludedIds].join(",") !== previousIds)
      map.setFilter("buildings", [
        "all",
        ["!=", ["get", "hide_3d"], true],
        ["!", ["in", ["id"], ["literal", [...excludedIds]]]],
      ]);
    const data =
      Math.max(map.getZoom(), focus?.zoom ?? 0) >= 13
        ? await worker.run<FeatureCollection<Polygon, { site: string }>>({
            kind: "architecture",
            buildings: buildings
              .filter((f) => !excludedIds.has(f.id!))
              .map(plainFeature),
            center: focus?.coordinates ?? map.getCenter().toArray(),
            focus,
            revision: navigationRevision,
          })
        : { type: "FeatureCollection" as const, features: [] };
    if (
      removed ||
      current !== revision ||
      navigationRevision !== navigation.revision
    )
      return;
    if (focus) {
      if (
        data.features.some(
          (feature) =>
            feature.properties.site === focus.id ||
            distanceMeters(
              feature.geometry.coordinates[0][0],
              focus.coordinates,
            ) <= 500,
        )
      )
        map.getContainer().dataset.destinationArchitectureReadyMs ??= String(
          performance.now() - focus.startedAt,
        );
      if (
        !map.isMoving() &&
        (map.areTilesLoaded() ||
          map.getContainer().dataset.destinationTilesReadyMs)
      ) {
        navigation.markReady(navigationRevision);
        map.getContainer().dataset.destinationSurroundingsReadyMs ??= String(
          performance.now() - focus.startedAt,
        );
      }
      map.getContainer().dataset.destinationArchitectureRevision = String(
        focus.revision,
      );
    }
    const next = JSON.stringify(data);
    if (next !== signature) {
      signature = next;
      (map.getSource(DETAIL_SOURCE) as GeoJSONSource).setData(data);
      map.getContainer().dataset.architectureDetails = String(
        data.features.length,
      );
      map.getContainer().dataset.architectureSites = [
        ...new Set(data.features.map((f) => f.properties.site)),
      ].join(",");
    }
  };
  const queue = new LatestQueue<number>(
    async () => {
      await rebuild();
    },
    (error) => {
      if (!removed) console.error("Architecture geometry failed", error);
    },
  );
  const schedule = () => {
    dirty = true;
    // Throttle rather than debounce: arriving tiles must not postpone work forever.
    if (timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      queue.replace([revision]);
    }, 160);
  };
  const unsubscribe = navigation.subscribe((reason) => {
    if (reason === "ready") return;
    revision++;
    dirty = true;
    delete map.getContainer().dataset.destinationArchitectureReadyMs;
    delete map.getContainer().dataset.destinationSurroundingsReadyMs;
    if (timer) clearTimeout(timer);
    timer = undefined;
    // Let the click handler start the camera before collecting tile footprints.
    queueMicrotask(() => {
      if (!removed) queue.replace([revision]);
    });
  });
  const source = (event: MapSourceDataEvent) => {
    if (event.sourceId === "osm") schedule();
  };
  map.on("style.load", install);
  map.on("sourcedata", source);
  map.on("moveend", schedule);
  map.on("atlas:settings", schedule);
  map.on("atlas:tiles-ready", schedule);
  map.on("atlas:models-ready", schedule);
  const idle = () => {
    if (dirty && !timer) schedule();
  };
  map.on("idle", idle);
  return () => {
    removed = true;
    revision++;
    unsubscribe();
    queue.dispose();
    worker.dispose();
    if (timer) clearTimeout(timer);
    map.off("style.load", install);
    map.off("sourcedata", source);
    map.off("moveend", schedule);
    map.off("atlas:settings", schedule);
    map.off("atlas:tiles-ready", schedule);
    map.off("atlas:models-ready", schedule);
    map.off("idle", idle);
  };
}
