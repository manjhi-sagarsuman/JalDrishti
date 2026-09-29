/**
 * Centralized API Client for JalDrishti geospatial backend services.
 * Configured via VITE_API_BASE_URL.
 */

export interface ApiClientConfig {
  baseUrl: string
  timeoutMs: number
}

const DEFAULT_TIMEOUT_MS = 15000

export function getApiBaseUrl(): string {
  const url = import.meta.env.VITE_API_BASE_URL
  return typeof url === "string" ? url.trim().replace(/\/+$/, "") : ""
}

export function isApiConfigured(): boolean {
  return getApiBaseUrl().length > 0
}

export class ApiError extends Error {
  readonly status?: number
  readonly data?: unknown

  constructor(message: string, status?: number, data?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.data = data
  }
}

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal })
    return response
  } finally {
    clearTimeout(timeout)
  }
}

export async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    throw new ApiError("VITE_API_BASE_URL is not configured.")
  }

  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  const targetUrl = `${baseUrl}${cleanEndpoint}`

  const headers = new Headers(options.headers)
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json")
  }
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }

  try {
    const response = await fetchWithTimeout(targetUrl, {
      ...options,
      headers,
    })

    if (!response.ok) {
      let errorMessage = `API request failed with status ${response.status}: ${response.statusText}`
      try {
        const errorJson = await response.json()
        if (errorJson && typeof errorJson === "object" && "message" in errorJson) {
          errorMessage = String(errorJson.message)
        }
      } catch {
        // use default error message
      }
      throw new ApiError(errorMessage, response.status)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  } catch (error: unknown) {
    if (error instanceof ApiError) throw error
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(`API request to ${cleanEndpoint} timed out after ${DEFAULT_TIMEOUT_MS}ms.`)
    }
    throw new ApiError(error instanceof Error ? error.message : "Network error occurred connecting to API.")
  }
}
