import { type NextRequest, NextResponse } from "next/server"

const DATA_API_URL = "https://data-api.polymarket.com"
const GAMMA_API_URL = "https://gamma-api.polymarket.com"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 })
  }

  try {
    const positionsRes = await fetch(`${DATA_API_URL}/positions?user=${address.toLowerCase()}`)

    if (!positionsRes.ok) {
      return NextResponse.json({ positions: [] })
    }

    const rawPositions = await positionsRes.json()

    if (!Array.isArray(rawPositions) || rawPositions.length === 0) {
      return NextResponse.json({ positions: [] })
    }

    // Filter to only open positions and enrich with market data
    const openPositions = rawPositions.filter((p: { size: number }) => p.size > 0)

    // Fetch market details for each position
    const enrichedPositions = await Promise.all(
      openPositions.slice(0, 50).map(
        async (position: {
          asset: string
          conditionId: string
          size: number
          avgPrice: number
          curPrice: number
          outcomeIndex?: number
        }) => {
          try {
            // Try to get market info
            const marketRes = await fetch(`${GAMMA_API_URL}/markets?condition_id=${position.conditionId}`)
            const markets = marketRes.ok ? await marketRes.json() : []
            const market = markets[0]

            const avgPrice = position.avgPrice || 0
            const curPrice = position.curPrice || avgPrice
            const size = position.size || 0
            const value = size * curPrice
            const cost = size * avgPrice
            const pnl = value - cost
            const pnlPercent = cost > 0 ? (pnl / cost) * 100 : 0

            // Parse outcomes
            let outcome = "Unknown"
            const outcomeIndex = position.outcomeIndex ?? 0
            if (market?.outcomes) {
              try {
                const outcomes = JSON.parse(market.outcomes)
                outcome = outcomes[outcomeIndex] || "Unknown"
              } catch {
                outcome = "Unknown"
              }
            }

            return {
              id: position.asset || position.conditionId,
              marketId: market?.id || position.conditionId,
              conditionId: position.conditionId,
              title: market?.question || "Unknown Market",
              outcome,
              outcomeIndex,
              size,
              avgPrice,
              curPrice,
              pnl,
              pnlPercent,
              value,
            }
          } catch {
            return null
          }
        },
      ),
    )

    const validPositions = enrichedPositions.filter(Boolean)

    return NextResponse.json({ positions: validPositions })
  } catch (error) {
    console.error("Positions fetch error:", error)
    return NextResponse.json({ positions: [] })
  }
}
