import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("https://gamma-api.polymarket.com/tags?limit=100", {
      headers: {
        Accept: "application/json",
      },
      cache: "force-cache",
      next: { revalidate: 3600 }, // Cache for 1 hour
    })

    if (!response.ok) {
      throw new Error("Failed to fetch tags")
    }

    const tags = await response.json()
    return NextResponse.json(tags)
  } catch (error) {
    console.error("Error fetching tags:", error)
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 })
  }
}
