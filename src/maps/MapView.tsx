import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import * as maplibregl from "maplibre-gl"
import type { ExpressionSpecification, StyleSpecification } from "maplibre-gl"
import type { FeatureCollection, Geometry } from "geojson"
import { House } from "lucide-react"
import { IconButton } from "../components/ui"
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
  streetStyle?: string | StyleSpecification
  satelliteStyle?: string | StyleSpecification
  visibleLayerIds?: readonly MapLayerId[]
  onVisibleLayersChange?: (visibleLayers: MapLayerId[]) => void
  className?: string
}

const DATA_SOURCE_ID = "jaldrishti-feature-data"
const FILL_LAYER_ID = "jaldrishti-feature-fill"
const LINE_LAYER_ID = "jaldrishti-feature-line"
const POINT_LAYER_ID = "jaldrishti-feature-point"
const DATA_LAYERS = [FILL_LAYER_ID, LINE_LAYER_ID, POINT_LAYER_ID]
const EMPTY_DATA: MapFeatureCollection = { type: "FeatureCollection", features: [] }
const EMPTY_MARKERS: readonly MapMarker[] = []

const defaultStreetStyle: StyleSpecification = {
  version: 8,
  sources: {
    "open-street-map": {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "open-street-map-raster", type: "raster", source: "open-street-map", minzoom: 0, maxzoom: 19 }],
}

function layerColorExpression(): ExpressionSpecification {
  return ["match", ["get", "layerId"], ...mapLayers.flatMap((layer) => [layer.id, layer.color]), "#378b5c"] as unknown as ExpressionSpecification
}

function layerFilter(visibleLayerIds: readonly MapLayerId[], geometryType: "Polygon" | "LineString" | "Point") {
  return [
    "all",
    ["in", ["get", "layerId"], ["literal", [...visibleLayerIds]]],
    ["==", ["geometry-type"], geometryType],
  ] as maplibregl.FilterSpecification
}

function popupMarkup(title: string, layerId: string | undefined, properties: Record<string, unknown> | undefined) {
  return renderToStaticMarkup(<MapPopup title={title} layerId={layerId} properties={properties} />)
}

/** Reusable, prop-driven MapLibre canvas. Features must include a `layerId` property from mapLayers. */
export function MapView({
  data = EMPTY_DATA,
  markers = EMPTY_MARKERS,
  initialView,
  fitBounds,
  initialBaseMap: requestedBaseMap,
  streetStyle = defaultStreetStyle,
  satelliteStyle,
  visibleLayerIds: controlledVisibleLayers,
  onVisibleLayersChange,
  className = "",
}: MapViewProps) {
  const { session } = useAuth()
  const preferences = useUserSettings(session?.user.id ?? "anonymous")
  const initialBaseMap = requestedBaseMap ?? preferences.map.defaultBaseMap
  const effectiveInitialView = initialView ?? { center: [78.96, 20.59] as [number, number], zoom: preferences.map.defaultZoom }
  const mapElement = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markerRefs = useRef<maplibregl.Marker[]>([])
  const featureDataRef = useRef(data)
  const preferencesRef = useRef(preferences)
  const visibleLayersRef = useRef<MapLayerId[]>([...(controlledVisibleLayers ?? preferences.map.defaultLayerIds ?? defaultVisibleLayers)])
  const [internalVisibleLayers, setInternalVisibleLayers] = useState<MapLayerId[]>([...(controlledVisibleLayers ?? preferences.map.defaultLayerIds ?? defaultVisibleLayers)])
  const [baseMap, setBaseMap] = useState<BaseMapId>(initialBaseMap === "satellite" && satelliteStyle ? "satellite" : "streets")
  const [cursorCoordinates, setCursorCoordinates] = useState<string | null>(null)
  const [styleRevision, setStyleRevision] = useState(0)
  const isControlled = controlledVisibleLayers !== undefined
  const visibleLayers = controlledVisibleLayers ?? internalVisibleLayers

  const view = effectiveInitialView
  const activeStyle = baseMap === "satellite" && satelliteStyle ? satelliteStyle : streetStyle
  const appliedStyleRef = useRef<string | StyleSpecification>(activeStyle)
  const layerColors = useMemo(() => layerColorExpression(), [])

  useEffect(() => {
    featureDataRef.current = data
  }, [data])

  useEffect(() => { preferencesRef.current = preferences }, [preferences])

  useEffect(() => {
    visibleLayersRef.current = [...visibleLayers]
  }, [visibleLayers])

  const toggleLayer = useCallback((id: MapLayerId) => {
    const next = visibleLayersRef.current.includes(id)
      ? visibleLayersRef.current.filter((layerId) => layerId !== id)
      : [...visibleLayersRef.current, id]
    visibleLayersRef.current = next
    if (!isControlled) setInternalVisibleLayers(next)
    onVisibleLayersChange?.(next)
  }, [isControlled, onVisibleLayersChange])

  useEffect(() => {
    if (!mapElement.current) return

    const map = new maplibregl.Map({
      container: mapElement.current,
      style: activeStyle,
      center: view.center,
      zoom: view.zoom,
      cooperativeGestures: true,
    })
    mapRef.current = map
    map.addControl(new maplibregl.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), "top-right")
    map.addControl(new maplibregl.FullscreenControl(), "top-right")
    map.addControl(new maplibregl.GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false, showUserLocation: true }), "top-right")
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left")

    const addDataLayers = () => {
      if (!map.getSource(DATA_SOURCE_ID)) {
        map.addSource(DATA_SOURCE_ID, { type: "geojson", data: featureDataRef.current })
      }
      if (!map.getLayer(FILL_LAYER_ID)) {
        map.addLayer({
          id: FILL_LAYER_ID,
          type: "fill",
          source: DATA_SOURCE_ID,
          filter: layerFilter(visibleLayersRef.current, "Polygon"),
          paint: { "fill-color": layerColors, "fill-opacity": 0.24, "fill-outline-color": layerColors },
        })
      }
      if (!map.getLayer(LINE_LAYER_ID)) {
        map.addLayer({
          id: LINE_LAYER_ID,
          type: "line",
          source: DATA_SOURCE_ID,
          filter: ["in", ["get", "layerId"], ["literal", [...visibleLayersRef.current]]],
          paint: { "line-color": layerColors, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1.5, 12, 3] },
        })
      }
      if (!map.getLayer(POINT_LAYER_ID)) {
        map.addLayer({
          id: POINT_LAYER_ID,
          type: "circle",
          source: DATA_SOURCE_ID,
          filter: layerFilter(visibleLayersRef.current, "Point"),
          paint: { "circle-radius": ["interpolate", ["linear"], ["zoom"], 3, 4, 12, 8], "circle-color": layerColors, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1.5 },
        })
      }
      setStyleRevision((revision) => revision + 1)
    }

    function handleMapClick(event: maplibregl.MapMouseEvent) {
      const activeLayers = DATA_LAYERS.filter((id) => map.getLayer(id))
      const feature = activeLayers.length ? map.queryRenderedFeatures(event.point, { layers: activeLayers })[0] : undefined
      if (!feature) return
      const properties = (feature.properties ?? {}) as Record<string, unknown>
      const title = typeof properties.title === "string" ? properties.title : typeof properties.name === "string" ? properties.name : "Map feature"
      new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "300px" })
        .setLngLat(event.lngLat)
        .setHTML(popupMarkup(title, typeof properties.layerId === "string" ? properties.layerId : undefined, properties))
        .addTo(map)
    }

    function handleMapMouseMove(event: maplibregl.MapMouseEvent) {
      if (preferencesRef.current.map.showCursorCoordinates) setCursorCoordinates(formatCoordinate(event.lngLat.lng, event.lngLat.lat, preferencesRef.current.map.coordinateFormat))
      const activeLayers = DATA_LAYERS.filter((id) => map.getLayer(id))
      const featureAtPointer = activeLayers.length > 0 && map.queryRenderedFeatures(event.point, { layers: activeLayers }).length > 0
      map.getCanvas().style.cursor = featureAtPointer ? "pointer" : ""
    }

    function handleMapMouseLeave() { setCursorCoordinates(null) }

    map.on("style.load", addDataLayers)
    map.on("click", handleMapClick)
    map.on("mousemove", handleMapMouseMove)
    map.on("mouseout", handleMapMouseLeave)

    return () => {
      markerRefs.current.forEach((marker) => marker.remove())
      markerRefs.current = []
      map.remove()
      mapRef.current = null
    }
    // A MapLibre instance is created once. Style and GeoJSON updates use dedicated effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const source = map.getSource(DATA_SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    source?.setData(data)
  }, [data, styleRevision])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const polygonFilter = layerFilter(visibleLayers, "Polygon")
    const pointFilter = layerFilter(visibleLayers, "Point")
    const lineFilter = ["in", ["get", "layerId"], ["literal", visibleLayers]] as maplibregl.FilterSpecification
    if (map.getLayer(FILL_LAYER_ID)) map.setFilter(FILL_LAYER_ID, polygonFilter)
    if (map.getLayer(LINE_LAYER_ID)) map.setFilter(LINE_LAYER_ID, lineFilter)
    if (map.getLayer(POINT_LAYER_ID)) map.setFilter(POINT_LAYER_ID, pointFilter)
  }, [visibleLayers, styleRevision])

  useEffect(() => {
    const map = mapRef.current
    if (!map || activeStyle === appliedStyleRef.current) return
    appliedStyleRef.current = activeStyle
    map.setStyle(activeStyle)
  }, [activeStyle])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !fitBounds) return
    map.fitBounds(fitBounds, { padding: 48, maxZoom: 13, duration: 650 })
  }, [fitBounds, styleRevision])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markerRefs.current.forEach((marker) => marker.remove())
    markerRefs.current = markers
      .filter((marker) => visibleLayers.includes(marker.layerId))
      .map((markerData) => {
        const layer = mapLayers.find((item) => item.id === markerData.layerId)
        const popup = new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: "300px" })
          .setHTML(popupMarkup(markerData.title, markerData.layerId, markerData.properties))
        return new maplibregl.Marker({ color: layer?.color ?? "#0b416c" })
          .setLngLat(markerData.coordinates)
          .setPopup(popup)
          .addTo(map)
      })
    return () => markerRefs.current.forEach((marker) => marker.remove())
  }, [markers, styleRevision, visibleLayers])

  function changeBaseMap(id: BaseMapId) {
    if (id === "satellite" && !satelliteStyle) return
    setBaseMap(id)
  }

  function resetView() {
    mapRef.current?.flyTo({ center: view.center, zoom: view.zoom, bearing: 0, pitch: 0, duration: 700 })
  }

  return (
    <div className={`relative isolate h-[min(78vh,58rem)] min-h-[32rem] w-full overflow-hidden rounded-xl border border-line bg-slate-100 ${className}`}>
      <div aria-label="Interactive GIS map" className="absolute inset-0" ref={mapElement} role="application" />
      <div className="absolute left-3 top-3 z-10"><LayerControl baseMap={baseMap} onBaseMapChange={changeBaseMap} onLayerToggle={toggleLayer} satelliteAvailable={Boolean(satelliteStyle)} visibleLayers={visibleLayers} /></div>
      <IconButton className="absolute right-3 top-[13.75rem] z-10 border border-line bg-white text-brand-800 shadow-md hover:bg-blue-50" icon={House} label="Reset map view" onClick={resetView} />
      <MapLegend className="absolute bottom-14 left-3 z-10" visibleLayers={visibleLayers} />
      {preferences.map.showCursorCoordinates && cursorCoordinates && <output className="absolute bottom-3 right-3 z-10 rounded-md border border-line bg-white/95 px-2.5 py-1.5 text-[10px] font-medium text-ink shadow-sm" aria-label="Pointer coordinates">{cursorCoordinates}</output>}
      {data.features.length === 0 && markers.length === 0 && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-lg border border-line bg-white/95 px-3 py-2 text-center text-[11px] text-muted shadow-sm">
          No mapped GIS features are available for this view.
        </div>
      )}
    </div>
  )
}

export default MapView
