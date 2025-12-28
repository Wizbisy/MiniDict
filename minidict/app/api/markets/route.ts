import { NextResponse } from "next/server"

const GAMMA_API_BASE = "https://gamma-api.polymarket.com"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)

  // Build params for Gamma API
  const params = new URLSearchParams()

  const limit = searchParams.get("limit")
  const offset = searchParams.get("offset")
  const tag = searchParams.get("tag")
  const closed = searchParams.get("closed")
  const order = searchParams.get("order")
  const ascending = searchParams.get("ascending")
  const active = searchParams.get("active")

  if (limit) params.append("limit", limit)
  if (offset) params.append("offset", offset)
  if (tag) params.append("tag", tag)
  if (closed) params.append("closed", closed)
  if (order) params.append("order", order)
  if (ascending) params.append("ascending", ascending)
  if (active) params.append("active", active)

  try {
    const response = await fetch(`${GAMMA_API_BASE}/markets?${params.toString()}`, {
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 30 },
    })

    if (!response.ok) {
      return NextResponse.json({ error: `Gamma API error: ${response.statusText}` }, { status: response.status })
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Failed to fetch markets:", error)
    return NextResponse.json({ error: "Failed to fetch markets" }, { status: 500 })
  }
}
