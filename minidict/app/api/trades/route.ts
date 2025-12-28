import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 })
  }

  try {
    // Fetch user's trading history from Polymarket Data API
    const res = await fetch(`https://data-api.polymarket.com/trades?user=${address.toLowerCase()}&limit=50`, {
      headers: {
        Accept: "application/json",
      },
    })

    if (!res.ok) {
      return NextResponse.json({ trades: [] })
    }

    const data = await res.json()

    // Transform the data to a cleaner format
    const trades = (data || []).map((trade: Record<string, unknown>) => ({
      id: trade.id || `${trade.timestamp}-${Math.random()}`,
      market: trade.market_slug || trade.title || "Unknown Market",
      outcome: trade.outcome || trade.asset_ticker || "Unknown",
      side: trade.side === "BUY" ? "buy" : "sell",
      amount: Number.parseFloat(String(trade.size || trade.amount || 0)),
      price: Number.parseFloat(String(trade.price || 0)),
      timestamp: trade.timestamp || trade.created_at || new Date().toISOString(),
    }))

    return NextResponse.json({ trades })
  } catch (error) {
    console.error("Failed to fetch trades:", error)
    return NextResponse.json({ trades: [] })
  }
}
