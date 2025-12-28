import { NextResponse } from "next/server"

export async function GET() {
  const URL = process.env.NEXT_PUBLIC_URL || "https://minidict.app"
  const LOGO_IMAGE = `${URL}/images/minidict-logo.png`

  return NextResponse.json({
    "accountAssociation": {
    "header": "eyJmaWQiOjEwNDExMzIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg5ODQyN2Q1M0MwYjA2MDk1OGQ0MWRhYTI1ZTI0MTcyOGE4ZTMwOWFkIn0",
    "payload": "eyJkb21haW4iOiJtaW5pZGljdC5hcHAifQ",
    "signature": "Nvy2a6cY8VHVXQu2OEMnRm6WhSimOKO36+VysaEbQxZmlYV2BztYNQPM3ZrpBzNO8RuoKUbnhn6a9yZRFzQ/cBw="
    },
    miniapp: {
      version: "1",
      name: "Minidict",
      homeUrl: "https://minidict.app",
      iconUrl: "https://minidict.app/images/minidict-logo.png",
      splashImageUrl: "https://minidict.app/images/minidict-logo.png",
      splashBackgroundColor: "#0a0a14",
      webhookUrl: "https://minidict.app/api/webhook",
      subtitle: "Trade prediction markets",
      description: "Trade prediction markets on Polymarket with real-time data. Built for Base and Farcaster.",
      screenshotUrls: [],
      primaryCategory: "finance",
      tags: ["polymarket", "prediction-markets", "trading", "defi", "base"],
      heroImageUrl: "https://minidict.app/images/minidict-logo.png",
      tagline: "Trade markets on Base",
      ogTitle: "Minidict - Polymarket on Base",
      ogDescription: "Trade prediction markets with real-time data from Polymarket",
      ogImageUrl: "https://minidict.app/images/minidict-logo.png",
      noindex: false,
    },
  })
}
