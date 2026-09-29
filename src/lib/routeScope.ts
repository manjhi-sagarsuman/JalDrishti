export interface RouteDateRange {
  start: string
  end: string
}

export function readRouteDateRange(params: URLSearchParams): RouteDateRange {
  const start = params.get("from") ?? ""
  const end = params.get("to") ?? ""
  return {
    start: isIsoDate(start) ? start : "",
    end: isIsoDate(end) ? end : "",
  }
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00Z`).getTime())
}

export function isWithinRouteDateRange(value: string | null | undefined, range: RouteDateRange) {
  if (!range.start && !range.end) return true
  if (!value) return false
  const day = value.slice(0, 10)
  return (!range.start || day >= range.start) && (!range.end || day <= range.end)
}

export function buildScopedPath(path: string, watershedId: string, range: RouteDateRange) {
  const params = new URLSearchParams({ watershed: watershedId })
  if (range.start) params.set("from", range.start)
  if (range.end) params.set("to", range.end)
  return `${path}?${params.toString()}`
}
