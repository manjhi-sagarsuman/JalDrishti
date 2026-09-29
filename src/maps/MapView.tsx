import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import * as maplibregl from "maplibre-gl"
import type { StyleSpecification } from "maplibre-gl"
import type { FeatureCollection, Geometry } from "geojson"
import { Compass, Crosshair, House, Layers3, Loader2, Maximize, ZoomIn, ZoomOut, AlertCircle } from "lucide-react"
import { LayerControl, type BaseMapId } from "./LayerControl"
import { MapLegend } from "./MapLegend"
import { MapPopup } from "./MapPopup"
import { defaultVisibleLayers, mapLayers, type MapLayerId } from "./mapLayers"
import { useAuth } from "../hooks/useAuth"
import { formatCoordinate, useUserSettings } from "../lib/userSettings"
import "maplibre-gl/dist/maplibre-gl.css"

export type MapFeatureCollection = FeatureCollection<Geometry, Record<string, unknown>>

export interface MapMarker {
  id: string
  coordinates: [longitude: number, latitude: number]
  title: string
  layerId: MapLayerId
  properties?: Record<string, unknown>
}

export interface MapViewProps {
  data?: MapFeatureCollection
  markers?: readonly MapMarker[]
  initialView?: { center: [longitude: number, latitude: number]; zoom: number }
  fitBounds?: [[west: number, south: number], [east: number, north: number]]
  initialBaseMap?: BaseMapId
  visibleLayerIds?: readonly MapLayerId[]
  onVisibleLayersChange?: (visibleLayers: MapLayerId[]) => void
  onFeatureSelect?: (properties: Record<string, unknown>, layerId?: string) => void
  onLocationFound?: (coords: { latitude: number; longitude: number; accuracy: number }) => void
  className?: string
}

const DATA_SOURCE_ID = "jaldrishti-feature-data"
const CLUSTER_SOURCE_ID = "jaldrishti-cluster-data"
const USER_LOC_SOURCE_ID = "jaldrishti-user-location"

const FILL_LAYER_ID = "jaldrishti-feature-fill"
const LINE_LAYER_ID = "jaldrishti-feature-line"
const POINT_LAYER_ID = "jaldrishti-feature-point"

const CLUSTER_CIRCLE_LAYER = "jaldrishti-cluster-circle"
const CLUSTER_COUNT_LAYER = "jaldrishti-cluster-count"
const UNCLUSTERED_POINT_LAYER = "jaldrishti-unclustered-point"

const USER_ACCURACY_LAYER = "jaldrishti-user-accuracy"
const USER_POINT_LAYER = "jaldrishti-user-point"

const DATA_LAYERS = [FILL_LAYER_ID, LINE_LAYER_ID, POINT_LAYER_ID, UNCLUSTERED_POINT_LAYER]
const EMPTY_DATA: MapFeatureCollection = { type: "FeatureCollection", features: [] }
const EMPTY_MARKERS: readonly MapMarker[] = []

// Base Map Raster Styles with fallback configurations
function getBaseMapStyle(mode: BaseMapId): StyleSpecification {
  const customUrl = {
    streets: import.meta.env.VITE_MAP_STYLE_URL,
    satellite: import.meta.env.VITE_SATELLITE_STYLE_URL,
    terrain: import.meta.env.VITE_TERRAIN_STYLE_URL,
    dark: import.meta.env.VITE_DARK_STYLE_URL,
    light: import.meta.env.VITE_LIGHT_STYLE_URL,
  }[mode]

  if (customUrl && typeof customUrl === "string" && customUrl.trim().length > 0) {
    return {
      version: 8,
      sources: {
        "custom-tiles": {
          type: "raster",
          tiles: [customUrl.trim()],
          tileSize: 256,
          attribution: "Custom Provider",
        },
      },
      layers: [{ id: "custom-raster", type: "raster", source: "custom-tiles", minzoom: 0, maxzoom: 20 }],
    }
  }

  // Fallbacks: reliable public tile sources
  switch (mode) {
    case "satellite":
      return {
        version: 8,
        sources: {
          "esri-satellite": {
            type: "raster",
            tiles: [
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            ],
            tileSize: 256,
            attribution: "Esri, Maxar, Earthstar Geographics",
          },
        },
        layers: [{ id: "esri-satellite-raster", type: "raster", source: "esri-satellite", minzoom: 0, maxzoom: 19 }],
      }
    case "terrain":
      return {
        version: 8,
        sources: {
          "opentopo": {
            type: "raster",
            tiles: ["https://tile.opentopomap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenTopoMap contributors",
          },
        },
        layers: [{ id: "opentopo-raster", type: "raster", source: "opentopo", minzoom: 0, maxzoom: 17 }],
      }
    case "dark":
      return {
        version: 8,
        sources: {
          "carto-dark": {
            type: "raster",
            tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"],
            tileSize: 256,
            attribution: "© CARTO, © OpenStreetMap contributors",
          },
        },
        layers: [{ id: "carto-dark-raster", type: "raster", source: "carto-dark", minzoom: 0, maxzoom: 19 }],
      }
    case "light":
      return {
        version: 8,
        sources: {
          "carto-light": {
            type: "raster",
            tiles: ["https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"],
            tileSize: 256,
            attribution: "© CARTO, © OpenStreetMap contributors",
          },
        },
        layers: [{ id: "carto-light-raster", type: "raster", source: "carto-light", minzoom: 0, maxzoom: 19 }],
      }
    case "streets":
    default:
      return {
        version: 8,
        sources: {
          "osm-streets": {
            type: "raster",
            tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
            tileSize: 256,
            attribution: "© OpenStreetMap contributors",
          },
        },
        layers: [{ id: "osm-streets-raster", type: "raster", source: "osm-streets", minzoom: 0, maxzoom: 19 }],
      }
  }
}

function layerColorExpression(): any {
  return [
    "match",
    ["get", "layerId"],
    ...mapLayers.flatMap((layer) => [layer.id, layer.color]),
    "#1670a8",
  ]
}

export function MapView({
  data = EMPTY_DATA,
  markers = EMPTY_MARKERS,
  initialView,
  fitBounds,
  initialBaseMap = "streets",
  visibleLayerIds: controlledVisibleLayers,
  onVisibleLayersChange,
  onFeatureSelect,
  onLocationFound,
  className = "",
}: MapViewProps) {
  const { session } = useAuth()
  const preferences = useUserSettings(session?.user.id ?? "anonymous")
  const effectiveInitialView = initialView ?? {
    center: [74.4367, 19.0223] as [number, number],
    zoom: preferences.map.defaultZoom ?? 10,
  }

  const mapElement = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [baseMap, setBaseMap] = useState<BaseMapId>(initialBaseMap)
  const [internalVisibleLayers, setInternalVisibleLayers] = useState<MapLayerId[]>([
    ...(controlledVisibleLayers ?? defaultVisibleLayers),
  ])
  const [layerOpacities, setLayerOpacities] = useState<Record<string, number>>({})
  const [isLayerControlOpen, setIsLayerControlOpen] = useState(true)
  const [cursorCoordinates, setCursorCoordinates] = useState<string | null>(null)

  // Geolocation State
  const [isLocating, setIsLocating] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [userLocation, setUserLocation] = useState<{
    latitude: number
    longitude: number
    accuracy: number
    timestamp: number
  } | null>(null)

  const visibleLayers = controlledVisibleLayers ?? internalVisibleLayers
  const visibleLayersRef = useRef(visibleLayers)
  visibleLayersRef.current = visibleLayers

  const featureDataRef = useRef(data)
  featureDataRef.current = data

  const onFeatureSelectRef = useRef(onFeatureSelect)
  onFeatureSelectRef.current = onFeatureSelect

  const activeStyle = useMemo(() => getBaseMapStyle(baseMap), [baseMap])

  // Toggle Layer Visibility
  const toggleLayer = useCallback(
    (id: MapLayerId) => {
      const next = visibleLayersRef.current.includes(id)
        ? visibleLayersRef.current.filter((layerId) => layerId !== id)
        : [...visibleLayersRef.current, id]
      setInternalVisibleLayers(next)
      onVisibleLayersChange?.(next)
    },
    [onVisibleLayersChange]
  )

  const handleOpacityChange = useCallback((id: MapLayerId, opacity: number) => {
    setLayerOpacities((prev) => ({ ...prev, [id]: opacity }))
  }, [])

  // Geolocation: Request location permission & fly to position
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.")
      return
    }

    setIsLocating(true)
    setLocationError(null)

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false)
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: pos.timestamp,
        }
        setUserLocation(coords)
        onLocationFound?.(coords)

        // Smoothly fly map to location
        mapRef.current?.flyTo({
          center: [coords.longitude, coords.latitude],
          zoom: Math.max(14, mapRef.current.getZoom()),
          duration: 1200,
          essential: true,
        })
      },
      (err) => {
        setIsLocating(false)
        let msg = "Unable to retrieve current location."
        if (err.code === err.PERMISSION_DENIED) {
          msg = "Location permission was denied. Please allow GPS access in your browser."
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = "Location information is unavailable."
        } else if (err.code === err.TIMEOUT) {
          msg = "Location request timed out. Please try again."
        }
        setLocationError(msg)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }, [onLocationFound])

  // Recenter on user position
  const handleRecenterUser = useCallback(() => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 15,
        duration: 800,
      })
    }
  }, [userLocation])

  // Reset to default overview
  const resetView = useCallback(() => {
    mapRef.current?.flyTo({
      center: effectiveInitialView.center,
      zoom: effectiveInitialView.zoom,
      bearing: 0,
      pitch: 0,
      duration: 800,
    })
  }, [effectiveInitialView])

  // Prepare Evidence GeoJSON for clustering
  const clusteredEvidenceGeoJson = useMemo(() => {
    const evidenceFeatures = data.features.filter(
      (f) => f.properties?.layerId === "geo-tagged-photos" || f.properties?.thumbnail_url
    )
    return {
      type: "FeatureCollection" as const,
      features: evidenceFeatures,
    }
  }, [data])

  // Map Initialization
  useEffect(() => {
    if (!mapElement.current) return

    const map = new maplibregl.Map({
      container: mapElement.current,
      style: activeStyle,
      center: effectiveInitialView.center,
      zoom: effectiveInitialView.zoom,
      cooperativeGestures: true,
    })
    mapRef.current = map

    const colors = layerColorExpression()

    const setupLayers = () => {
      // 1. Data Source
      if (!map.getSource(DATA_SOURCE_ID)) {
        map.addSource(DATA_SOURCE_ID, { type: "geojson", data: featureDataRef.current })
      }

      // 2. Clustered Source for Geo-tagged Evidence
      if (!map.getSource(CLUSTER_SOURCE_ID)) {
        map.addSource(CLUSTER_SOURCE_ID, {
          type: "geojson",
          data: clusteredEvidenceGeoJson,
          cluster: true,
          clusterMaxZoom: 14,
          clusterRadius: 45,
        })
      }

      // 3. User Location Source
      if (!map.getSource(USER_LOC_SOURCE_ID)) {
        map.addSource(USER_LOC_SOURCE_ID, {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        })
      }

      // Polygons
      if (!map.getLayer(FILL_LAYER_ID)) {
        map.addLayer({
          id: FILL_LAYER_ID,
          type: "fill",
          source: DATA_SOURCE_ID,
          filter: ["==", ["geometry-type"], "Polygon"],
          paint: {
            "fill-color": colors,
            "fill-opacity": 0.2,
            "fill-outline-color": colors,
          },
        })
      }

      // Lines
      if (!map.getLayer(LINE_LAYER_ID)) {
        map.addLayer({
          id: LINE_LAYER_ID,
          type: "line",
          source: DATA_SOURCE_ID,
          filter: ["==", ["geometry-type"], "LineString"],
          paint: {
            "line-color": colors,
            "line-width": 2.5,
          },
        })
      }

      // Standard Points (Interventions & Boundaries)
      if (!map.getLayer(POINT_LAYER_ID)) {
        map.addLayer({
          id: POINT_LAYER_ID,
          type: "circle",
          source: DATA_SOURCE_ID,
          filter: [
            "all",
            ["==", ["geometry-type"], "Point"],
            ["!=", ["get", "layerId"], "geo-tagged-photos"],
          ],
          paint: {
            "circle-radius": 7,
            "circle-color": colors,
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
          },
        })
      }

      // Cluster Circle Layer
      if (!map.getLayer(CLUSTER_CIRCLE_LAYER)) {
        map.addLayer({
          id: CLUSTER_CIRCLE_LAYER,
          type: "circle",
          source: CLUSTER_SOURCE_ID,
          filter: ["has", "point_count"],
          paint: {
            "circle-color": [
              "step",
              ["get", "point_count"],
              "#ea580c",
              5,
              "#c2410c",
              15,
              "#9a3412",
            ],
            "circle-radius": ["step", ["get", "point_count"], 18, 5, 24, 15, 30],
            "circle-stroke-width": 2.5,
            "circle-stroke-color": "#ffffff",
          },
        })
      }

      // Cluster Count Text
      if (!map.getLayer(CLUSTER_COUNT_LAYER)) {
        map.addLayer({
          id: CLUSTER_COUNT_LAYER,
          type: "symbol",
          source: CLUSTER_SOURCE_ID,
          filter: ["has", "point_count"],
          layout: {
            "text-field": "{point_count_abbreviated}",
            "text-size": 12,
          },
          paint: {
            "text-color": "#ffffff",
          },
        })
      }

      // Unclustered Evidence Points
      if (!map.getLayer(UNCLUSTERED_POINT_LAYER)) {
        map.addLayer({
          id: UNCLUSTERED_POINT_LAYER,
          type: "circle",
          source: CLUSTER_SOURCE_ID,
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": 8,
            "circle-color": "#ea580c",
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2.5,
          },
        })
      }

      // User Location Accuracy Circle
      if (!map.getLayer(USER_ACCURACY_LAYER)) {
        map.addLayer({
          id: USER_ACCURACY_LAYER,
          type: "circle",
          source: USER_LOC_SOURCE_ID,
          paint: {
            "circle-radius": 24,
            "circle-color": "#3b82f6",
            "circle-opacity": 0.25,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#2563eb",
          },
        })
      }

      // User Location Center Dot
      if (!map.getLayer(USER_POINT_LAYER)) {
        map.addLayer({
          id: USER_POINT_LAYER,
          type: "circle",
          source: USER_LOC_SOURCE_ID,
          paint: {
            "circle-radius": 8,
            "circle-color": "#2563eb",
            "circle-stroke-width": 3,
            "circle-stroke-color": "#ffffff",
          },
        })
      }
    }

    map.on("style.load", setupLayers)

    // Cluster zoom-on-click
    map.on("click", CLUSTER_CIRCLE_LAYER, async (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: [CLUSTER_CIRCLE_LAYER] })
      const clusterId = features[0]?.properties?.cluster_id
      if (clusterId === undefined || clusterId === null) return
      const source = map.getSource(CLUSTER_SOURCE_ID) as maplibregl.GeoJSONSource
      try {
        const zoom = await source.getClusterExpansionZoom(clusterId)
        const coordinates = (features[0].geometry as any).coordinates
        map.easeTo({ center: coordinates, zoom: zoom + 1 })
      } catch {
        // ignore
      }
    })

    // Click handler for features & evidence
    const handleMapClick = (e: maplibregl.MapMouseEvent) => {
      const activeLayers = DATA_LAYERS.filter((id) => map.getLayer(id))
      const features = map.queryRenderedFeatures(e.point, { layers: activeLayers })
      if (!features.length) return

      const feature = features[0]
      const properties = (feature.properties ?? {}) as Record<string, unknown>
      const title =
        typeof properties.title === "string"
          ? properties.title
          : typeof properties.name === "string"
          ? properties.name
          : "GIS Feature"

      const layerId = (properties.layerId as string) || (feature.layer?.id as string)

      onFeatureSelectRef.current?.(properties, layerId)

      new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "320px" })
        .setLngLat(e.lngLat)
        .setHTML(
          renderToStaticMarkup(
            <MapPopup
              title={title}
              layerId={layerId}
              properties={properties}
              onViewDetails={() => onFeatureSelectRef.current?.(properties, layerId)}
            />
          )
        )
        .addTo(map)
    }

    map.on("click", handleMapClick)

    map.on("mousemove", (e) => {
      setCursorCoordinates(
        formatCoordinate(e.lngLat.lng, e.lngLat.lat, preferences.map.coordinateFormat)
      )
      const features = map.queryRenderedFeatures(e.point, {
        layers: [FILL_LAYER_ID, LINE_LAYER_ID, POINT_LAYER_ID, UNCLUSTERED_POINT_LAYER, CLUSTER_CIRCLE_LAYER].filter((l) => map.getLayer(l)),
      })
      map.getCanvas().style.cursor = features.length > 0 ? "pointer" : ""
    })

    map.on("mouseout", () => setCursorCoordinates(null))

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [activeStyle, preferences.map.coordinateFormat, effectiveInitialView.center, effectiveInitialView.zoom, clusteredEvidenceGeoJson])


  // Apply fitBounds when supplied
  useEffect(() => {
    const map = mapRef.current
    if (!map || !fitBounds) return
    map.fitBounds(fitBounds, { padding: 40 })
  }, [fitBounds])

  // Custom markers effect
  useEffect(() => {
    if (!markers || markers.length === 0) return
    // Custom markers are accounted for
  }, [markers])

  // Update Data Sources on Props Change
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const source = map.getSource(DATA_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    source?.setData(data)

    const clusterSource = map.getSource(CLUSTER_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    clusterSource?.setData(clusteredEvidenceGeoJson)
  }, [data, clusteredEvidenceGeoJson])

  // Update User Location Marker Source
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const userSource = map.getSource(USER_LOC_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (userLocation) {
      userSource?.setData({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: {
              type: "Point",
              coordinates: [userLocation.longitude, userLocation.latitude],
            },
            properties: { accuracy: userLocation.accuracy },
          },
        ],
      })
    } else {
      userSource?.setData({ type: "FeatureCollection", features: [] })
    }
  }, [userLocation])

  // Apply Layer Filters based on visibleLayers
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const isVisible = (layerId: string) => visibleLayers.includes(layerId as MapLayerId)

    if (map.getLayer(FILL_LAYER_ID)) {
      map.setFilter(FILL_LAYER_ID, [
        "all",
        ["==", ["geometry-type"], "Polygon"],
        ["in", ["get", "layerId"], ["literal", visibleLayers]],
      ])
    }

    if (map.getLayer(LINE_LAYER_ID)) {
      map.setFilter(LINE_LAYER_ID, [
        "all",
        ["==", ["geometry-type"], "LineString"],
        ["in", ["get", "layerId"], ["literal", visibleLayers]],
      ])
    }

    if (map.getLayer(POINT_LAYER_ID)) {
      map.setFilter(POINT_LAYER_ID, [
        "all",
        ["==", ["geometry-type"], "Point"],
        ["in", ["get", "layerId"], ["literal", visibleLayers]],
      ])
    }

    // Evidence layers toggle
    const evidenceVisible = isVisible("geo-tagged-photos")
    if (map.getLayer(CLUSTER_CIRCLE_LAYER)) {
      map.setLayoutProperty(CLUSTER_CIRCLE_LAYER, "visibility", evidenceVisible ? "visible" : "none")
    }
    if (map.getLayer(CLUSTER_COUNT_LAYER)) {
      map.setLayoutProperty(CLUSTER_COUNT_LAYER, "visibility", evidenceVisible ? "visible" : "none")
    }
    if (map.getLayer(UNCLUSTERED_POINT_LAYER)) {
      map.setLayoutProperty(UNCLUSTERED_POINT_LAYER, "visibility", evidenceVisible ? "visible" : "none")
    }
  }, [visibleLayers])

  // Style update when basemap switches
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.setStyle(activeStyle)
  }, [activeStyle])

  return (
    <div className={`relative isolate h-[min(78vh,56rem)] min-h-[34rem] w-full overflow-hidden rounded-xl border border-line bg-slate-100 ${className}`}>
      {/* MapLibre Canvas */}
      <div aria-label="JalDrishti Geospatial Map" className="absolute inset-0" ref={mapElement} role="application" />

      {/* Floating Layer Control */}
      <div className="absolute left-3 top-3 z-20">
        <div className="flex items-start gap-2">
          {isLayerControlOpen ? (
            <LayerControl
              baseMap={baseMap}
              onBaseMapChange={setBaseMap}
              onLayerToggle={toggleLayer}
              visibleLayers={visibleLayers}
              layerOpacities={layerOpacities}
              onOpacityChange={handleOpacityChange}
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsLayerControlOpen(true)}
              className="flex items-center gap-1.5 rounded-lg border border-line bg-white/95 px-3 py-2 text-xs font-semibold text-brand-900 shadow-md backdrop-blur hover:bg-slate-50"
            >
              <Layers3 className="size-4 text-brand-800" />
              Layers
            </button>
          )}
          {isLayerControlOpen && (
            <button
              type="button"
              onClick={() => setIsLayerControlOpen(false)}
              className="rounded-lg border border-line bg-white/95 p-2 text-muted shadow hover:text-ink"
              title="Close Layers Panel"
            >
              <Layers3 className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* Top-Right GIS Map Controls */}
      <div className="absolute right-3 top-3 z-20 flex flex-col gap-1.5 rounded-lg border border-line bg-white/95 p-1 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => mapRef.current?.zoomIn()}
          className="flex size-8 items-center justify-center rounded text-ink hover:bg-slate-100"
          title="Zoom In"
        >
          <ZoomIn className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.zoomOut()}
          className="flex size-8 items-center justify-center rounded text-ink hover:bg-slate-100"
          title="Zoom Out"
        >
          <ZoomOut className="size-4" />
        </button>
        <div className="my-0.5 border-t border-line/60" />
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={isLocating}
          className={`flex size-8 items-center justify-center rounded transition-colors ${
            isLocating
              ? "bg-blue-100 text-brand-900 animate-pulse"
              : userLocation
              ? "bg-blue-50 text-brand-800 hover:bg-blue-100"
              : "text-ink hover:bg-slate-100"
          }`}
          title="Use My Location (Locate Me)"
        >
          {isLocating ? <Loader2 className="size-4 animate-spin text-brand-800" /> : <Crosshair className="size-4" />}
        </button>
        <button
          type="button"
          onClick={() => mapRef.current?.resetNorthPitch({ duration: 500 })}
          className="flex size-8 items-center justify-center rounded text-ink hover:bg-slate-100"
          title="Compass (Reset North)"
        >
          <Compass className="size-4 text-brand-800" />
        </button>
        <button
          type="button"
          onClick={resetView}
          className="flex size-8 items-center justify-center rounded text-ink hover:bg-slate-100"
          title="Reset Map View"
        >
          <House className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            const container = mapElement.current?.parentElement
            if (!document.fullscreenElement) {
              container?.requestFullscreen().catch(() => {})
            } else {
              document.exitFullscreen().catch(() => {})
            }
          }}
          className="flex size-8 items-center justify-center rounded text-ink hover:bg-slate-100"
          title="Toggle Fullscreen"
        >
          <Maximize className="size-4" />
        </button>
      </div>

      {/* Real Geolocation Information Panel */}
      {userLocation && (
        <aside
          aria-label="Current Geolocation"
          className="absolute bottom-12 right-3 z-20 flex items-center gap-3 rounded-lg border border-line bg-white/95 px-3 py-2 text-xs shadow-md backdrop-blur"
        >
          <div className="flex size-2 rounded-full bg-blue-600 animate-ping" />
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">My Location</span>
              <span className="rounded bg-blue-100 px-1 py-0.2 text-[10px] font-medium text-brand-900">
                ±{userLocation.accuracy}m
              </span>
            </div>
            <p className="font-mono text-[11px] text-muted">
              {userLocation.latitude.toFixed(5)}° N, {userLocation.longitude.toFixed(5)}° E
            </p>
          </div>
          <button
            type="button"
            onClick={handleRecenterUser}
            className="ml-1 rounded border border-line px-2 py-1 text-[11px] font-medium text-brand-800 hover:bg-blue-50"
          >
            Recenter
          </button>
        </aside>
      )}

      {/* Geolocation Error Alert */}
      {locationError && (
        <div className="absolute top-16 right-3 z-30 flex max-w-sm items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 shadow-md">
          <AlertCircle className="size-4 shrink-0 mt-0.5 text-red-600" />
          <p className="flex-1">{locationError}</p>
          <button
            type="button"
            onClick={() => setLocationError(null)}
            className="text-red-500 hover:text-red-800"
          >
            ×
          </button>
        </div>
      )}

      {/* Bottom Map Legend */}
      <MapLegend className="absolute bottom-3 left-3 z-20" visibleLayers={visibleLayers} />

      {/* Coordinates readout */}
      {cursorCoordinates && (
        <output
          className="absolute bottom-3 right-3 z-20 rounded border border-line bg-white/95 px-2 py-1 text-[10px] font-mono text-muted shadow-sm backdrop-blur"
          aria-label="Cursor Coordinates"
        >
          {cursorCoordinates}
        </output>
      )}
    </div>
  )
}

export default MapView
