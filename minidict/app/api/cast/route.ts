import { type NextRequest, NextResponse } from "next/server"
import { getCastByHash } from "@/lib/farcaster"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const hash = searchParams.get("hash")

  if (!hash) {
    return NextResponse.json({ error: "Cast hash required" }, { status: 400 })
  }

  try {
    const cast = await getCastByHash(hash)

    if (!cast) {
      return NextResponse.json({ error: "Cast not found" }, { status: 404 })
    }

    return NextResponse.json(cast)
  } catch (error) {
    console.error("Failed to fetch cast:", error)
    return NextResponse.json({ error: "Failed to fetch cast" }, { status: 500 })
  }
}
