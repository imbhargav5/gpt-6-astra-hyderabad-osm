import {
  installFlyovers,
  applyFlyoverSettings,
  watchFlyovers,
} from "./flyovers";
import { placeCategories, type Category } from "./place-categories";
import { CategoryPicker } from "./CategoryPicker";
import { nextPlaceIndex } from "./category-navigation";
import { placeModelsLayer } from "./place-models";
import { installSiteDetails, applySiteSettings } from "./place-surfaces";
import { installTraffic } from "./traffic";
import { buddhaLayer } from "./buddha";
import {
  installLandmarkDetails,
  applyLandmarkDetailSettings,
} from "./landmark-detail";
import { readMapSettings, writeMapSettings } from "./map-settings";
import { play as playSound } from "cuelume";
import { changeSoundEnabled, readSoundEnabled, playSliderTick } from "./sounds";
import { landTexture } from "./land-texture";
import { forestLayer } from "./forest";
import { CITY_BOUNDS, citySlab } from "./city-slab";
import { installMouseOrbit } from "./mouse-orbit";
import { useEffect, useRef, useState } from "react";
import maplibregl, { type Map as AtlasMap } from "maplibre-gl";
import {
  ShoppingBag,
  Hospital,
  Church,
  Plane,
  Shield,
  House,
  Landmark as HeritageIcon,
  ArrowDownLeft,
  ArrowRight,
  BookOpen,
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Compass,
  Droplets,
  Expand,
  Info,
  Layers,
  MapPin,
  Moon,
  Mountain,
  Navigation,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Share2,
  SlidersHorizontal,
  Sun,
  Sunset,
  Trees,
  X,
  Minus,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  landmarks,
  searchLandmarks,
  tourStops,
  type Landmark,
} from "./landmarks";
import {
  buildingHeight,
  createStyle,
  layerGroups,
  type LayerKey,
  type Theme,
} from "./map-style";

const reducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const defaultView = {
  center: [78.4685, 17.4195] as [number, number],
  zoom: 14.25,
  pitch: 57,
  bearing: -25,
};
const categoryIcons = {
  "Heritage & culture": HeritageIcon,
  "Temples & worship": Church,
  "Lakes & reservoirs": Droplets,
  "Parks, wildlife & sports": Trees,
  "Shopping malls": ShoppingBag,
  Healthcare: Hospital,
  "Tech & business": Building2,
  Neighbourhoods: House,
  "Transport & aviation": Plane,
  "Government & defence": Shield,
} satisfies Record<Category, typeof Building2>;
function PlaceCategoryIcon({ category }: { category: Category }) {
  const Icon = categoryIcons[category];
  return <Icon size={18} />;
}
function PlaceAvatar({
  place,
  large = false,
}: {
  place: Landmark;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const size = large ? 80 : 40;
  return (
    <span
      className={`place-icon place-avatar${large ? " place-avatar-large" : ""}`}
      aria-hidden="true"
    >
      {failed ? (
        <PlaceCategoryIcon category={place.category} />
      ) : (
        <img
          src={`${import.meta.env.BASE_URL}places/${place.id}.jpg`}
          alt=""
          width={size}
          height={size}
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
const layerNames: Record<LayerKey, string> = {
  buildings: "3D buildings",
  roads: "Roads & rail",
  water: "Lakes & waterways",
  parks: "Greenery & woodland",
  labels: "Place names",
};
export default function App() {
  const [savedSettings] = useState(readMapSettings);
  const [soundEnabled, setSoundEnabled] = useState(readSoundEnabled);
  const container = useRef<HTMLDivElement>(null);
  const placeList = useRef<HTMLDivElement>(null);
  const map = useRef<AtlasMap | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [ready, setReady] = useState(false);
  const [mapError, setMapError] = useState("");
  const [theme, setTheme] = useState<Theme>(savedSettings.theme);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchToggle = useRef<HTMLButtonElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus({ preventScroll: true });
  }, [searchOpen]);
  const [categoryIndex, setCategoryIndex] = useState(0);
  const category = placeCategories[categoryIndex];
  const [selected, setSelected] = useState<Landmark | null>(null);
  const [panel, setPanel] = useState<"layers" | "about" | null>(null);
  const [mobilePlaces, setMobilePlaces] = useState(false);
  const [height, setHeight] = useState(savedSettings.height);
  const [terrain, setTerrain] = useState(savedSettings.terrain);
  const [traffic, setTraffic] = useState(savedSettings.traffic);
  const [terrainOn, setTerrainOn] = useState(savedSettings.terrainOn);
  const [layers, setLayers] = useState<Record<LayerKey, boolean>>(
    savedSettings.layers,
  );
  const [tourIndex, setTourIndex] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [view, setView] = useState({
    lat: 17.4195,
    lng: 78.4685,
    zoom: 14.25,
    bearing: -25,
    pitch: 57,
  });
  const selectRef = useRef<(place: Landmark) => void>(() => {});
  const stopRef = useRef<() => void>(() => {});
  const flightRef = useRef<() => void>(() => {});
  const config = useRef({ theme, height, terrain, terrainOn, layers, traffic });
  config.current = { theme, height, terrain, terrainOn, layers, traffic };
  useEffect(() => {
    writeMapSettings({ theme, height, terrain, terrainOn, layers, traffic });
  }, [theme, height, terrain, terrainOn, layers, traffic]);
  const applySettings = (m: AtlasMap) => {
    const s = config.current;
    for (const [key, ids] of Object.entries(layerGroups))
      for (const id of ids)
        if (m.getLayer(id))
          m.setLayoutProperty(
            id,
            "visibility",
            s.layers[key as LayerKey] ? "visible" : "none",
          );
    if (m.getLayer("buildings")) {
      m.setPaintProperty(
        "buildings",
        "fill-extrusion-height",
        buildingHeight(s.height),
      );
      m.setPaintProperty("buildings", "fill-extrusion-base", [
        "*",
        ["coalesce", ["get", "render_min_height"], 0],
        s.height,
      ]);
    }
    applyLandmarkDetailSettings(m, {
      height: s.height,
      theme: s.theme,
      visible: s.layers.buildings,
    });
    applyFlyoverSettings(m, {
      terrainOn: config.current.terrainOn,
      visible: config.current.layers.roads,
      height: config.current.height,
      theme: config.current.theme,
    });
    applySiteSettings(m, {
      theme: s.theme,
      height: s.height,
      parks: s.layers.parks,
      roads: s.layers.roads,
      buildings: s.layers.buildings,
    });
    m.setTerrain(
      s.terrainOn ? { source: "terrain", exaggeration: s.terrain } : null,
    );
    if (m.getLayer("hillshade"))
      m.setLayoutProperty(
        "hillshade",
        "visibility",
        s.terrainOn ? "visible" : "none",
      );
  };
  useEffect(() => {
    if (!container.current) return;
    let m: AtlasMap;
    try {
      m = new maplibregl.Map({
        container: container.current,
        style: createStyle(config.current.theme, config.current.height),
        ...defaultView,
        minZoom: 8,
        maxZoom: 19,
        maxPitch: 75,
        renderWorldCopies: false,
        hash: true,
        attributionControl: false,
        canvasContextAttributes: { antialias: true },
      });
    } catch (error) {
      console.error("Map initialization failed:", error);
      setMapError(
        "Your browser could not start the 3D map. Enable hardware acceleration or try a WebGL-capable browser.",
      );
      return;
    }
    map.current = m;
    const removeFlyovers = watchFlyovers(m);
    const removeLandmarkDetails = installLandmarkDetails(m, () => ({
      height: config.current.height,
      theme: config.current.theme,
      visible: config.current.layers.buildings,
    }));
    const removeTraffic = installTraffic(
      m,
      () => config.current.traffic && config.current.layers.roads,
    );
    const removeMouseOrbit = installMouseOrbit(m, () => stopRef.current());
    m.addControl(
      new maplibregl.AttributionControl({ compact: true }),
      "bottom-right",
    );
    // Start compact attribution closed, including when source credits arrive later.
    // Keep the native info button and its accessible expand/collapse behavior.
    const attribution = m
      .getContainer()
      .querySelector<HTMLDetailsElement>(".maplibregl-ctrl-attrib");
    if (attribution) {
      attribution.classList.add("maplibregl-compact");
      attribution.classList.remove("maplibregl-compact-show");
      attribution.open = false;
    }
    m.addControl(
      new maplibregl.ScaleControl({ maxWidth: 110, unit: "metric" }),
      "bottom-right",
    );
    const timeout = window.setTimeout(
      () =>
        setMapError(
          "Map data is taking longer than expected. Check your connection, then retry.",
        ),
      25000,
    );
    m.on("style.load", () => {
      if (!m.hasImage("land-grain")) m.addImage("land-grain", landTexture());
      installSiteDetails(m);
      installFlyovers(m);
      applySettings(m);
      if (!m.getLayer("forest-trees"))
        m.addLayer(
          forestLayer(() => ({
            visible: config.current.layers.parks,
            height: config.current.height,
            terrain: config.current.terrain,
            terrainOn: config.current.terrainOn,
            theme: config.current.theme,
          })),
          "water-labels",
        );
      if (!m.getLayer("detailed-place-models"))
        m.addLayer(
          placeModelsLayer(() => ({
            visible: config.current.layers.buildings,
            height: config.current.height,
            terrainOn: config.current.terrainOn,
            theme: config.current.theme,
          })),
          "water-labels",
        );
      if (!m.getLayer("buddha-statue"))
        m.addLayer(
          buddhaLayer(() => ({
            visible: config.current.layers.buildings,
            height: config.current.height,
            terrainOn: config.current.terrainOn,
            theme: config.current.theme,
          })),
          "water-labels",
        );
      if (!m.getLayer("city-slab")) m.addLayer(citySlab());
    });
    m.on("load", () => {
      clearTimeout(timeout);
      setReady(true);
      setMapError("");
    });
    m.on("error", (e) => {
      console.warn("Map data:", e.error.message);
      setMapError(
        "Some map data could not load. Check your connection or retry the map.",
      );
    });
    m.on("idle", () => {
      if (m.areTilesLoaded()) setMapError("");
    });
    m.on("moveend", () => {
      const p = m.getCenter();
      setView({
        lat: p.lat,
        lng: p.lng,
        zoom: m.getZoom(),
        bearing: m.getBearing(),
        pitch: m.getPitch(),
      });
    });
    m.on("movestart", (e) => {
      if (e.originalEvent) stopRef.current();
    });
    m.getCanvas().addEventListener("webglcontextlost", () =>
      setMapError(
        "The graphics context was interrupted. Reload the map to continue.",
      ),
    );
    markers.current = landmarks.map((p) => {
      const el = document.createElement("button");
      el.className = "landmark-marker";
      el.type = "button";
      el.setAttribute("aria-pressed", "false");
      el.setAttribute("aria-label", `Explore ${p.name}`);
      el.title = p.name;
      el.dataset.id = p.id;
      const label = document.createElement("span");
      label.className = "landmark-label";
      label.textContent = p.name;
      const stem = document.createElement("span");
      stem.className = "landmark-stem";
      stem.setAttribute("aria-hidden", "true");
      const dot = document.createElement("span");
      dot.className = "landmark-dot";
      dot.setAttribute("aria-hidden", "true");
      el.append(label, stem, dot);
      el.addEventListener("click", () => selectRef.current(p));
      return new maplibregl.Marker({ element: el, anchor: "center" })
        .setLngLat(p.coordinates)
        .addTo(m);
    });
    return () => {
      clearTimeout(timeout);
      removeMouseOrbit();
      removeTraffic();
      removeLandmarkDetails();
      removeFlyovers();
      markers.current.forEach((marker) => marker.remove());
      m.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    const m = map.current;
    if (!m || !ready || !m.getLayer("background")) return;
    const style = createStyle(theme, config.current.height);
    for (const layer of style.layers)
      for (const [property, value] of Object.entries(layer.paint ?? {}))
        m.setPaintProperty(layer.id, property, value);
    applyFlyoverSettings(m, {
      terrainOn: config.current.terrainOn,
      visible: config.current.layers.roads,
      height: config.current.height,
      theme: config.current.theme,
    });
    applySiteSettings(m, {
      theme,
      height: config.current.height,
      parks: config.current.layers.parks,
      roads: config.current.layers.roads,
      buildings: config.current.layers.buildings,
    });
    m.setLight(style.light!);
    m.setSky(style.sky!);
    applyLandmarkDetailSettings(m, {
      height: config.current.height,
      theme,
      visible: config.current.layers.buildings,
    });
  }, [theme, ready]);
  useEffect(() => {
    const m = map.current;
    // Tile downloads can make isStyleLoaded() false during a camera flight.
    // The layers already exist, so apply user settings immediately.
    if (m?.getLayer("background")) applySettings(m);
  }, [ready, height, terrain, terrainOn, layers]);
  useEffect(() => {
    markers.current.forEach((marker) => {
      const el = marker.getElement();
      const active = el.dataset.id === selected?.id;
      el.classList.toggle("selected", active);
      el.setAttribute("aria-pressed", String(active));
    });
  }, [selected]);
  function flyTo(place: Landmark) {
    playSound("page");
    setSelected(place);
    setMobilePlaces(false);
    map.current?.flyTo({
      center: place.coordinates,
      zoom: place.zoom,
      bearing: place.bearing,
      pitch: 60,
      duration: reducedMotion() ? 0 : 2600,
      padding: {
        left: window.innerWidth > 900 ? 180 : 0,
        right: 0,
        top: 0,
        bottom: window.innerWidth < 700 ? 100 : 0,
      },
    });
  }
  function stopTour() {
    setPlaying(false);
  }
  stopRef.current = stopTour;
  selectRef.current = (place) => {
    stopTour();
    setTourIndex(-1);
    flyTo(place);
  };
  function visitCategory(index: number) {
    setCategoryIndex(index);
    setQuery("");
    flyTo(tourStops[index]);
    setMobilePlaces(mobilePlaces);
    if (placeList.current) placeList.current.scrollTop = 0;
  }
  flightRef.current = () => visitCategory(tourIndex);
  useEffect(() => {
    if (!playing || tourIndex < 0 || !ready) return;
    flightRef.current();
    const timeout = window.setTimeout(() => {
      if (tourIndex >= tourStops.length - 1) {
        setPlaying(false);
      } else setTourIndex((i) => i + 1);
    }, 8500);
    return () => clearTimeout(timeout);
  }, [playing, tourIndex, ready]);
  function toggleTour() {
    if (playing) {
      playSound("droplet");
      setPlaying(false);
      map.current?.stop();
    } else {
      if (tourIndex < 0 || tourIndex === tourStops.length - 1) setTourIndex(0);
      setPlaying(true);
      setPanel(null);
      setMobilePlaces(false);
    }
  }
  function stepTour(delta: number) {
    const next = Math.max(0, Math.min(tourStops.length - 1, tourIndex + delta));
    setTourIndex(next);
    if (!playing) visitCategory(next);
  }
  function home() {
    playSound("page");
    stopTour();
    setTourIndex(-1);
    setSelected(null);
    map.current?.flyTo({
      ...defaultView,
      padding: { top: 0, bottom: 0, left: 0, right: 0 },
      duration: reducedMotion() ? 0 : 1800,
    });
  }
  function overview() {
    playSound("page");
    stopTour();
    setTourIndex(-1);
    setSelected(null);
    setMobilePlaces(false);
    const m = map.current;
    if (!m) return;
    const [west, south, east, north] = CITY_BOUNDS;
    const camera = m.cameraForBounds(
      [
        [west, south],
        [east, north],
      ],
      {
        bearing: -25,
        padding: {
          top: 130,
          bottom: 110,
          left: window.innerWidth > 900 ? 370 : 45,
          right: 80,
        },
      },
    );
    if (camera)
      m.flyTo({
        ...camera,
        center: [(west + east) / 2, (south + north) / 2],
        zoom: (camera.zoom ?? 10.5) + (window.innerWidth > 900 ? 0.5 : 0.15),
        pitch: 50,
        padding: {
          top: 110,
          bottom: 85,
          left: window.innerWidth > 900 ? 350 : 30,
          right: 60,
        },
        duration: reducedMotion() ? 0 : 1800,
      });
  }
  async function share() {
    try {
      await navigator.clipboard.writeText(location.href);
      playSound("success");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      playSound("error");
      setMapError("Copy the URL from your address bar to share this map view.");
    }
  }
  const results = searchLandmarks(query, category);
  useEffect(() => {
    function navigatePlaces(event: KeyboardEvent) {
      if (
        event.defaultPrevented ||
        event.isComposing ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      if (
        event.target instanceof Element &&
        event.target.closest(
          "input, textarea, select, [contenteditable]:not([contenteditable='false']), [role='slider'], [role='textbox']",
        )
      )
        return;
      const index = nextPlaceIndex(
        results.findIndex((place) => place.id === selected?.id),
        results.length,
        event.key === "ArrowDown" ? 1 : -1,
      );
      if (index === null) return;
      event.preventDefault();
      event.stopPropagation();
      selectRef.current(results[index]);
      if (window.innerWidth <= 900) setMobilePlaces(true);
      const button =
        placeList.current?.querySelectorAll<HTMLButtonElement>(".place-row")[
          index
        ];
      button?.focus({ preventScroll: true });
      button?.scrollIntoView({
        block: "nearest",
        inline: "nearest",
        behavior: "instant",
      });
    }
    window.addEventListener("keydown", navigatePlaces, true);
    return () => window.removeEventListener("keydown", navigatePlaces, true);
  }, [results, selected?.id]);
  return (
    <main className={`atlas theme-${theme}`}>
      <div
        className="map-canvas"
        ref={container}
        aria-label="Interactive 3D map of Hyderabad"
      />
      <div className="map-vignette" />
      <header className="topbar">
        <button
          className="brand"
          onClick={home}
          aria-label="Hyderabad Atlas home"
        >
          <span className="brand-mark">
            <LandmarkLogo />
          </span>
          <span>
            <strong>
              HYDERABAD<span className="brand-dot">.</span>
            </strong>
            <small>A CITY IN THREE DIMENSIONS</small>
          </span>
        </button>
        <div className="top-actions">
          <button
            className="icon-button sound-button"
            aria-label="Interface sounds"
            aria-pressed={soundEnabled}
            title={
              soundEnabled ? "Mute interface sounds" : "Enable interface sounds"
            }
            onClick={() => {
              const enabled = !soundEnabled;
              changeSoundEnabled(enabled);
              setSoundEnabled(enabled);
            }}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <div className="mode-picker" aria-label="Map lighting">
            {(
              [
                { id: "day", Icon: Sun, label: "Day" },
                { id: "sunset", Icon: Sunset, label: "Sunset" },
                { id: "night", Icon: Moon, label: "Night" },
              ] as const
            ).map(({ id, Icon, label }) => (
              <button
                key={id}
                aria-label={label}
                aria-pressed={theme === id}
                data-cuelume-toggle={theme === id ? undefined : "toggle"}
                onClick={() => setTheme(id)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>
          <button
            className="icon-button info-button"
            aria-label="About this atlas"
            data-cuelume-toggle={panel === "about" ? "droplet" : "bloom"}
            onClick={() => setPanel(panel === "about" ? null : "about")}
          >
            <Info size={19} />
          </button>
        </div>
      </header>
      <aside
        className={`explore-panel ${mobilePlaces ? "mobile-open" : ""}`}
        aria-label="Explore places"
      >
        <div className="explore-heading">
          <div>
            <h1>Explore the city</h1>
            <p>
              {landmarks.length} places · {placeCategories.length} categories
            </p>
          </div>
          <div className="explore-actions">
            <button
              ref={searchToggle}
              className="icon-button search-toggle"
              aria-label={searchOpen ? "Close search" : "Open search"}
              title={searchOpen ? "Close search" : "Search places"}
              aria-expanded={searchOpen}
              aria-controls="place-search"
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (searchOpen) setQuery("");
                playSound(searchOpen ? "droplet" : "bloom");
              }}
            >
              <Search size={17} />
            </button>
            <span className="explore-action-divider" aria-hidden="true" />
            <button
              className="tour-button"
              disabled={!ready}
              onClick={toggleTour}
              aria-label={
                playing ? "Pause the city tour" : "Take the city tour"
              }
              title={
                playing
                  ? "Pause the city tour"
                  : "Tour the first place in every category"
              }
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              <span>{playing ? "Pause" : "Tour"}</span>
            </button>
          </div>
          <button
            className="mobile-close icon-button"
            aria-label="Close places"
            data-cuelume-toggle="droplet"
            onClick={() => setMobilePlaces(false)}
          >
            <X size={16} />
          </button>
        </div>
        <div
          className="search-reveal"
          data-open={searchOpen}
          inert={!searchOpen}
          aria-hidden={!searchOpen}
        >
          <div className="search-reveal-inner">
            <label className="search-box" id="place-search">
              <Search size={17} />
              <input
                ref={searchInput}
                value={query}
                onKeyDown={(event) => {
                  if (event.key !== "Escape") return;
                  event.preventDefault();
                  setSearchOpen(false);
                  setQuery("");
                  searchToggle.current?.focus();
                }}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find a landmark or neighbourhood"
                aria-label="Search places"
              />
              {query && (
                <button
                  data-cuelume-toggle="droplet"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <X size={14} />
                </button>
              )}
            </label>
          </div>
        </div>
        <CategoryPicker
          active={categoryIndex}
          counts={
            Object.fromEntries(
              placeCategories.map((name) => [
                name,
                landmarks.filter((place) => place.category === name).length,
              ]),
            ) as Record<Category, number>
          }
          onChange={(index) => {
            if (index === categoryIndex) return;
            stopTour();
            setTourIndex(-1);
            visitCategory(index);
          }}
        />
        <div className="results-count" aria-live="polite">
          <span>Places</span>
          <span>
            {results.length} {results.length === 1 ? "place" : "places"}
          </span>
        </div>
        <div
          className="place-list"
          ref={placeList}
          id="category-places"
          role="tabpanel"
          aria-labelledby={`category-tab-${categoryIndex}`}
          tabIndex={0}
        >
          {results.map((p) => (
            <button
              className={`place-row ${selected?.id === p.id ? "active" : ""}`}
              key={p.id}
              aria-current={selected?.id === p.id ? "true" : undefined}
              onClick={() => selectRef.current(p)}
            >
              <PlaceAvatar place={p} />
              <span className="place-text">
                <strong>{p.name}</strong>
                <small>{p.area}</small>
              </span>
              <ArrowRight size={15} />
            </button>
          ))}
          {results.length === 0 && (
            <div className="empty-state">
              <Search size={24} />
              <strong>No places found</strong>
              <p>Try another search or use → for the next category.</p>
              <button
                onClick={() => {
                  setQuery("");
                }}
              >
                Clear search
              </button>
            </div>
          )}
        </div>
        <div
          className="sidebar-footer keyboard-footer"
          aria-label="Keyboard shortcuts"
        >
          <span>
            <kbd>← →</kbd> Categories
          </span>
          <span>
            <kbd>↑ ↓</kbd> Places
          </span>
        </div>
      </aside>
      <button
        className="mobile-explore"
        data-cuelume-toggle={mobilePlaces ? "droplet" : "bloom"}
        onClick={() => setMobilePlaces(!mobilePlaces)}
      >
        <Search size={17} /> Explore Hyderabad
      </button>
      <nav className="map-controls" aria-label="Map controls">
        <button
          className="compass-button"
          aria-label="Reset bearing north"
          data-cuelume-toggle="tick"
          onClick={() => {
            stopTour();
            map.current?.easeTo({ bearing: 0, duration: 500 });
          }}
        >
          <span>N</span>
          <Navigation
            size={22}
            style={{ transform: `rotate(${-view.bearing}deg)` }}
          />
        </button>
        <div className="control-group">
          <button
            aria-label="Zoom in"
            data-cuelume-toggle="tick"
            onClick={() => {
              stopTour();
              map.current?.zoomIn();
            }}
          >
            <Plus size={20} />
          </button>
          <button
            aria-label="Zoom out"
            data-cuelume-toggle="tick"
            onClick={() => {
              stopTour();
              map.current?.zoomOut();
            }}
          >
            <Minus size={20} />
          </button>
        </div>
        <button
          aria-label={
            view.pitch > 10 ? "Switch to 2D view" : "Switch to 3D view"
          }
          onClick={() => {
            stopTour();
            map.current?.easeTo({
              pitch: view.pitch > 10 ? 0 : 60,
              duration: 700,
            });
          }}
          className="dimension-button"
          data-cuelume-toggle="toggle"
        >
          {view.pitch > 10 ? "2D" : "3D"}
        </button>
        <button
          aria-label="View entire city"
          title="View entire city"
          onClick={overview}
        >
          <Expand size={18} />
        </button>
        <button
          aria-label="Map layers and elevation"
          data-cuelume-toggle={panel === "layers" ? "droplet" : "bloom"}
          className={panel === "layers" ? "control-active" : ""}
          onClick={() => setPanel(panel === "layers" ? null : "layers")}
        >
          <SlidersHorizontal size={19} />
        </button>
        <button
          aria-label={copied ? "View link copied" : "Share view"}
          title={copied ? "View link copied" : "Share view"}
          onClick={share}
        >
          {copied ? <Check size={19} /> : <Share2 size={19} />}
        </button>
      </nav>
      {!ready && !mapError && (
        <div className="loading-card" role="status">
          <span className="loading-orbit" />
          <span>
            Bringing Hyderabad into view
            <small>Loading open map data & terrain…</small>
          </span>
        </div>
      )}
      {mapError && (
        <div className="error-card" role="alert">
          <Info size={18} />
          <span>{mapError}</span>
          <button onClick={() => location.reload()}>
            <RotateCcw size={14} /> Retry
          </button>
          <button
            data-cuelume-toggle="droplet"
            aria-label="Dismiss notice"
            onClick={() => setMapError("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      {panel && (
        <section
          className="settings-panel"
          aria-label={panel === "layers" ? "Map settings" : "About the atlas"}
        >
          <div className="panel-heading">
            <span>
              {panel === "layers" ? (
                <Layers size={18} />
              ) : (
                <BookOpen size={18} />
              )}
              <strong>
                {panel === "layers" ? "Make it your map" : "An open atlas"}
              </strong>
            </span>
            <button
              className="icon-button"
              aria-label="Close panel"
              data-cuelume-toggle="droplet"
              onClick={() => setPanel(null)}
            >
              <X size={18} />
            </button>
          </div>
          {panel === "layers" ? (
            <>
              <p className="panel-intro">
                A different perspective on familiar ground.
              </p>
              <div className="layer-options">
                {(Object.keys(layers) as LayerKey[]).map((key) => (
                  <label key={key}>
                    <span>
                      {key === "buildings" ? (
                        <Building2 size={17} />
                      ) : key === "water" ? (
                        <Droplets size={17} />
                      ) : key === "parks" ? (
                        <Trees size={17} />
                      ) : key === "roads" ? (
                        <Navigation size={17} />
                      ) : (
                        <MapPin size={17} />
                      )}{" "}
                      {layerNames[key]}
                    </span>
                    <input
                      type="checkbox"
                      data-cuelume-toggle="toggle"
                      checked={layers[key]}
                      onChange={(e) =>
                        setLayers((s) => ({ ...s, [key]: e.target.checked }))
                      }
                    />
                  </label>
                ))}
                <label>
                  <span>
                    <Mountain size={17} /> Terrain relief
                  </span>
                  <input
                    type="checkbox"
                    data-cuelume-toggle="toggle"
                    checked={terrainOn}
                    onChange={(e) => setTerrainOn(e.target.checked)}
                  />
                </label>
                <label>
                  <span>
                    <Navigation size={17} /> Gentle traffic
                  </span>
                  <input
                    type="checkbox"
                    data-cuelume-toggle="toggle"
                    checked={traffic}
                    onChange={(e) => setTraffic(e.target.checked)}
                  />
                </label>
              </div>
              <button
                className="terrain-preset"
                onClick={() => {
                  stopTour();
                  setTourIndex(-1);
                  setTerrainOn(true);
                  setTerrain(4);
                  flyTo(landmarks.find((place) => place.id === "golconda")!);
                  map.current?.flyTo({
                    center: [78.402, 17.39],
                    zoom: 13.6,
                    pitch: 72,
                    bearing: -35,
                    duration: reducedMotion() ? 0 : 2200,
                  });
                  setPanel(null);
                }}
              >
                <Mountain size={18} /> Explore the Deccan hills{" "}
                <ArrowRight size={16} />
              </button>
              <div className="slider-control">
                <label htmlFor="buildings-height">
                  Building height <strong>×{height.toFixed(1)}</strong>
                </label>
                <input
                  id="buildings-height"
                  type="range"
                  min="1"
                  max="4"
                  step="0.5"
                  value={height}
                  onChange={(e) => {
                    playSliderTick();
                    setHeight(+e.target.value);
                  }}
                  disabled={!layers.buildings}
                />
                <div>
                  <span>True scale</span>
                  <span>Exaggerated</span>
                </div>
              </div>
              <div className="slider-control">
                <label htmlFor="terrain-height">
                  Terrain elevation <strong>×{terrain.toFixed(1)}</strong>
                </label>
                <input
                  id="terrain-height"
                  type="range"
                  min="1"
                  max="6"
                  step="0.5"
                  value={terrain}
                  onChange={(e) => {
                    playSliderTick();
                    setTerrain(+e.target.value);
                  }}
                  disabled={!terrainOn}
                />
                <div>
                  <span>True scale</span>
                  <span>Exaggerated</span>
                </div>
              </div>
              <p className="data-note">
                Heights may be estimated in the source data. Exaggeration is
                visual, not a measurement.
              </p>
            </>
          ) : (
            <div className="about-content">
              <p>
                A living portrait of Hyderabad, built from open geographic data.
                Explore the city from its ancient centre to its expanding
                western skyline.
              </p>
              <h3>Real geography. A new perspective.</h3>
              <p>
                Buildings, roads, lakes and parks come from{" "}
                <a
                  href="https://www.openstreetmap.org/copyright"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenStreetMap contributors
                </a>
                , streamed through{" "}
                <a
                  href="https://openfreemap.org"
                  target="_blank"
                  rel="noreferrer"
                >
                  OpenFreeMap
                </a>{" "}
                using the OpenMapTiles schema. Terrain comes from{" "}
                <a
                  href="https://registry.opendata.aws/terrain-tiles/"
                  target="_blank"
                  rel="noreferrer"
                >
                  Mapzen / AWS Terrain Tiles
                </a>
                . Rendered with MapLibre GL JS.
              </p>
              <h3>A few things to know</h3>
              <p>
                Building coverage and heights vary. Missing heights use a 9 m
                fallback; the provider may also estimate heights. Default
                building and terrain exaggeration are ×2 and ×2.5. Landmark
                façades and the Charminar and Buddha models are illustrative
                details, not measured reconstructions. This is an exploration
                map, not a flood-risk or survey tool.
              </p>
              <p>
                Trees are illustrative forest symbols placed only in areas
                tagged as woodland in the map tiles. Grass, scrub and generic
                park boundaries do not generate trees. Unmapped canopy will be
                missing; tree sizes and spacing are stylized and change with
                zoom.
              </p>
              <p>
                Moving cars and aircraft are illustrative, following mapped
                roads and runways. They do not represent live traffic or
                flights. Gentle traffic pauses when reduced motion is enabled.
              </p>
              <h3>Find your way</h3>
              <p>
                In 3D, left-drag to orbit and tilt. Right-drag, Shift +
                left-drag, or Space + left-drag to pan. In 2D, left-drag also
                pans. Scroll or pinch to zoom; use two fingers to rotate and
                tilt. Use 1–9 and 0 to jump between categories, ← / → to cycle
                categories, and ↑ / ↓ to select places and fly to them. Map
                keyboard controls support + / − and Shift + arrows. The URL
                preserves your camera view.
              </p>
              <div className="source-badge">
                <span className="live-dot" /> Open data. Open possibilities.
              </div>
            </div>
          )}
        </section>
      )}
      {selected ? (
        <section className="place-detail" aria-label="Selected place">
          <div className="detail-heading">
            <PlaceAvatar key={selected.id} place={selected} large />
            <div className="detail-number">
              {String(landmarks.indexOf(selected) + 1).padStart(2, "0")}
              <span>/ {landmarks.length}</span>
            </div>
          </div>
          <div className="detail-content">
            <span className="eyebrow">
              {selected.category} <span>·</span> {selected.area}
            </span>
            <h2>{selected.name}</h2>
            <p>{selected.description}</p>
            {tourIndex >= 0 && (
              <div className="tour-progress">
                <button
                  aria-label="Previous tour stop"
                  disabled={tourIndex === 0}
                  onClick={() => stepTour(-1)}
                >
                  <ChevronLeft size={17} />
                </button>
                <button
                  onClick={toggleTour}
                  aria-label={playing ? "Pause tour" : "Resume tour"}
                >
                  {playing ? <Pause size={15} /> : <Play size={15} />}
                </button>
                <span>
                  {tourIndex + 1} of {tourStops.length}{" "}
                  <span className="muted">
                    · {playing ? "Tour in progress" : "Tour paused"}
                  </span>
                </span>
                <div className="tour-dots">
                  {tourStops.map((p, i) => (
                    <span
                      key={p.id}
                      className={i <= tourIndex ? "filled" : ""}
                    />
                  ))}
                </div>
                <button
                  aria-label="Next tour stop"
                  disabled={tourIndex === tourStops.length - 1}
                  onClick={() => stepTour(1)}
                >
                  <ChevronRight size={17} />
                </button>
              </div>
            )}
          </div>
          <button
            className="icon-button close-detail"
            aria-label="Close place details"
            data-cuelume-toggle="droplet"
            onClick={() => {
              stopTour();
              setSelected(null);
              setTourIndex(-1);
            }}
          >
            <X size={16} />
          </button>
        </section>
      ) : (
        <div className="map-caption">
          <span className="caption-rule" />
          <div>
            <span className="eyebrow">A NEW PERSPECTIVE</span>
            <p>
              The familiar, <em>rediscovered.</em>
            </p>
          </div>
          <ArrowDownLeft size={27} strokeWidth={1} />
        </div>
      )}
      <footer className="bottom-bar">
        <div>
          <span className="live-dot" />
          <strong>HYDERABAD ATLAS</strong>
          <span className="footer-divider" />
          <span className="footer-text">An open-source city exploration</span>
        </div>
        <div className="coordinates">
          <span className="footer-text">
            {view.lat.toFixed(4)}° N &nbsp; {view.lng.toFixed(4)}° E
          </span>
          <span className="footer-divider" />
          <span className="footer-text">ZOOM {view.zoom.toFixed(1)}</span>
        </div>
      </footer>
      <div className="gesture-hint">
        <Compass size={14} />
        <span>{view.pitch > 10 ? "Left-drag to orbit" : "Drag to pan"}</span>
        <i />
        <span>
          {view.pitch > 10
            ? "Right / Shift / Space-drag to pan"
            : "Scroll to zoom"}
        </span>
      </div>
    </main>
  );
}
function LandmarkLogo() {
  return (
    <svg
      width="26"
      height="26"
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 25V10m22 15V10M5 15h22M11 25v-5a5 5 0 0 1 10 0v5M2.5 10 5 4l2.5 6m17 0L27 4l2.5 6M3 25h26M11 15v-4h10v4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M13 11c0-4 3-5 3-5s3 1 3 5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
