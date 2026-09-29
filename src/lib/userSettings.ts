import { useSyncExternalStore } from "react"
import type { BaseMapId } from "../maps/LayerControl"
import { defaultVisibleLayers, mapLayers, type MapLayerId } from "../maps/mapLayers"

export interface UserSettings {
  application: { landingPage: string }
  map: { defaultBaseMap: BaseMapId; defaultZoom: number; coordinateFormat: "decimal" | "dms"; showCursorCoordinates: boolean; defaultLayerIds: MapLayerId[] }
  data: { dateTimeZone: "local" | "utc" }
  notifications: { dataValidation: boolean; analysisCompletion: boolean; reportGeneration: boolean }
}

const STORAGE_PREFIX = "jaldrishti-settings-v1:"
const defaults: UserSettings = {
  application: { landingPage: "/dashboard" },
  map: { defaultBaseMap: "streets", defaultZoom: 4, coordinateFormat: "decimal", showCursorCoordinates: true, defaultLayerIds: [...defaultVisibleLayers] },
  data: { dateTimeZone: "local" },
  notifications: { dataValidation: true, analysisCompletion: true, reportGeneration: true },
}
const cache = new Map<string, UserSettings>()
const subscribers = new Map<string, Set<() => void>>()

function storageKey(userId: string) { return `${STORAGE_PREFIX}${userId}` }

function readSettings(userId: string): UserSettings {
  if (!userId || userId === "anonymous" || typeof window === "undefined") return defaults
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(storageKey(userId)) ?? "null")
    if (typeof parsed !== "object" || parsed === null) return defaults
    const value = parsed as Partial<UserSettings>
    const layerIds = Array.isArray(value.map?.defaultLayerIds) ? value.map.defaultLayerIds.filter((id): id is MapLayerId => mapLayers.some((layer) => layer.id === id)) : defaults.map.defaultLayerIds
    return {
      application: { landingPage: ["/dashboard", "/gis/watersheds", "/analysis/analytics"].includes(value.application?.landingPage ?? "") ? value.application!.landingPage : defaults.application.landingPage },
      map: {
        defaultBaseMap: value.map?.defaultBaseMap === "satellite" ? "satellite" : "streets",
        defaultZoom: typeof value.map?.defaultZoom === "number" ? Math.min(18, Math.max(2, value.map.defaultZoom)) : defaults.map.defaultZoom,
        coordinateFormat: value.map?.coordinateFormat === "dms" ? "dms" : "decimal",
        showCursorCoordinates: typeof value.map?.showCursorCoordinates === "boolean" ? value.map.showCursorCoordinates : defaults.map.showCursorCoordinates,
        defaultLayerIds: layerIds,
      },
      data: { dateTimeZone: value.data?.dateTimeZone === "utc" ? "utc" : "local" },
      notifications: {
        dataValidation: value.notifications?.dataValidation !== false,
        analysisCompletion: value.notifications?.analysisCompletion !== false,
        reportGeneration: value.notifications?.reportGeneration !== false,
      },
    }
  } catch { return defaults }
}

export function getUserSettings(userId: string): UserSettings {
  if (!cache.has(userId)) cache.set(userId, readSettings(userId))
  return cache.get(userId) ?? defaults
}

export function subscribeUserSettings(userId: string, callback: () => void) {
  const callbacks = subscribers.get(userId) ?? new Set<() => void>()
  callbacks.add(callback)
  subscribers.set(userId, callbacks)
  return () => { callbacks.delete(callback); if (!callbacks.size) subscribers.delete(userId) }
}

export function updateUserSettings(userId: string, update: (current: UserSettings) => UserSettings) {
  if (!userId || userId === "anonymous") return
  const next = update(getUserSettings(userId))
  cache.set(userId, next)
  try { window.localStorage.setItem(storageKey(userId), JSON.stringify(next)) } catch { /* Browser privacy/storage limits leave the in-memory preference active for this session. */ }
  subscribers.get(userId)?.forEach((callback) => callback())
}

export function useUserSettings(userId: string): UserSettings {
  return useSyncExternalStore(
    (callback) => subscribeUserSettings(userId, callback),
    () => getUserSettings(userId),
    () => defaults,
  )
}

export function formatCoordinate(longitude: number, latitude: number, format: UserSettings["map"]["coordinateFormat"]) {
  if (format === "decimal") return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
  const dms = (value: number, positive: string, negative: string) => {
    const absolute = Math.abs(value)
    const degrees = Math.floor(absolute)
    const minutesFloat = (absolute - degrees) * 60
    const minutes = Math.floor(minutesFloat)
    const seconds = ((minutesFloat - minutes) * 60).toFixed(1)
    return `${degrees}° ${minutes}′ ${seconds}″ ${value >= 0 ? positive : negative}`
  }
  return `${dms(latitude, "N", "S")} · ${dms(longitude, "E", "W")}`
}

export function formatPreferredDate(value: string, zone: UserSettings["data"]["dateTimeZone"]) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short", ...(zone === "utc" ? { timeZone: "UTC" } : {}) })
}
