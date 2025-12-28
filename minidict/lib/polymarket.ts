import type { Market, Event, Tag } from "./types"

const API_BASE = "/api"

export async function fetchMarkets(options?: {
  limit?: number
  offset?: number
  tag?: string
  closed?: boolean
  active?: boolean
  order?: string
  ascending?: boolean
}): Promise<Market[]> {
  const params = new URLSearchParams()

  if (options?.limit) params.append("limit", options.limit.toString())
  if (options?.offset) params.append("offset", options.offset.toString())
  if (options?.tag) params.append("tag", options.tag)
  if (options?.closed !== undefined) params.append("closed", options.closed.toString())
  if (options?.active !== undefined) params.append("active", options.active.toString())
  if (options?.order) params.append("order", options.order)
  if (options?.ascending !== undefined) params.append("ascending", options.ascending.toString())

  const url = `${API_BASE}/markets?${params.toString()}`

  const response = await fetch(url)

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || `Failed to fetch markets: ${response.statusText}`)
  }

  return response.json()
}

export async function fetchEvents(options?: {
  limit?: number
  offset?: number
  tagId?: number
  closed?: boolean
  order?: string
  ascending?: boolean
}): Promise<Event[]> {
  const params = new URLSearchParams()

  if (options?.limit) params.append("limit", options.limit.toString())
  if (options?.offset) params.append("offset", options.offset.toString())
  if (options?.tagId) params.append("tag_id", options.tagId.toString())
  if (options?.closed !== undefined) params.append("closed", options.closed.toString())
  if (options?.order) params.append("order", options.order)
  if (options?.ascending !== undefined) params.append("ascending", options.ascending.toString())

  const url = `${API_BASE}/events?${params.toString()}`

  const response = await fetch(url, {
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch events: ${response.statusText}`)
  }

  return response.json()
}

export async function fetchTags(): Promise<Tag[]> {
  const response = await fetch(`${API_BASE}/tags`, {
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch tags: ${response.statusText}`)
  }

  return response.json()
}

export function parseOutcomes(outcomes: string | null): string[] {
  if (!outcomes) return []
  try {
    return JSON.parse(outcomes)
  } catch {
    return []
  }
}

export function parseOutcomePrices(prices: string | null): number[] {
  if (!prices) return []
  try {
    return JSON.parse(prices).map((p: string) => Number.parseFloat(p))
  } catch {
    return []
  }
}

export function formatVolume(volume: number | null | undefined): string {
  if (volume === null || volume === undefined) return "$0"
  if (volume >= 1000000) {
    return `$${(volume / 1000000).toFixed(1)}M`
  }
  if (volume >= 1000) {
    return `$${(volume / 1000).toFixed(1)}K`
  }
  return `$${volume.toFixed(0)}`
}

export function formatPercentage(price: number): string {
  return `${(price * 100).toFixed(0)}%`
}
