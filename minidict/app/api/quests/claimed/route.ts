import { NextResponse } from "next/server"
import { hasUserClaimed } from "@/lib/contracts"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const questId = Number.parseInt(searchParams.get("questId") || "", 10)
  const user = searchParams.get("user")

  if (!Number.isFinite(questId) || !user) {
    return NextResponse.json({ claimed: false }, { status: 400 })
  }

  try {
    const claimed = await hasUserClaimed(questId, user)
    return NextResponse.json({ claimed })
  } catch (error) {
    console.error("Failed to fetch claimed status:", error)
    return NextResponse.json({ claimed: false }, { status: 500 })
  }
}
