import { type NextRequest, NextResponse } from "next/server"

const DATA_API_URL = "https://data-api.polymarket.com"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 })
  }

  try {
    // Fetch positions and value in parallel
    const [positionsRes, valueRes] = await Promise.all([
      fetch(`${DATA_API_URL}/positions?user=${address.toLowerCase()}`),
      fetch(`${DATA_API_URL}/value?user=${address.toLowerCase()}`),
    ])

    const positions = positionsRes.ok ? await positionsRes.json() : []
    const valueData = valueRes.ok ? await valueRes.json() : []

    // Calculate portfolio value
    const totalValue = valueData[0]?.value || 0

    // Process positions to get open positions count and P&L
    const openPositions = Array.isArray(positions) ? positions.filter((p: { size: number }) => p.size > 0) : []

    // Calculate approximate P&L from positions
    let totalPnl = 0
    for (const position of openPositions) {
      if (position.avgPrice && position.curPrice && position.size) {
        const pnl = (position.curPrice - position.avgPrice) * position.size
        totalPnl += pnl
      }
    }

    return NextResponse.json({
      positions: openPositions,
      totalValue,
      openPositionsCount: openPositions.length,
      pnl: totalPnl,
    })
  } catch (error) {
    console.error("Portfolio fetch error:", error)
    return NextResponse.json({
      positions: [],
      totalValue: 0,
      openPositionsCount: 0,
      pnl: 0,
    })
  }
}
