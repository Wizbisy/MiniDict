import { NextResponse } from "next/server"
import { getAllMarkets } from "@/lib/contracts"
import { getCastsEngagement, getEngagementValue } from "@/lib/farcaster"

export async function GET() {
  try {
    const markets = await getAllMarkets()

    if (markets.length === 0) {
      return NextResponse.json([])
    }

    const castHashes = [...new Set(markets.map((m) => m.castHash))]

    const castsMap = await getCastsEngagement(castHashes)

    const enrichedMarkets = markets.map((market) => {
      const cast = castsMap.get(market.castHash)
      if (cast) {
        return {
          ...market,
          castAuthor: cast.author.username,
          castAuthorPfp: cast.author.pfpUrl,
          castText: cast.text,
          currentValue: getEngagementValue(cast, market.metricType),
        }
      }
      return market
    })

    return NextResponse.json(enrichedMarkets)
  } catch (error) {
    console.error("Failed to fetch markets:", error)
    return NextResponse.json([])
  }
}
