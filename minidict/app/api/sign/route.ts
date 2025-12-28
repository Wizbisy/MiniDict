import { NextResponse } from "next/server"
import { generateBuilderHeaders } from "@/lib/polymarket-clob"

// Remote signing endpoint for builder authentication
// This keeps builder credentials secure on the server
export async function POST(request: Request) {
  try {
    const { method, path, body } = await request.json()

    if (!method || !path) {
      return NextResponse.json({ error: "Missing method or path" }, { status: 400 })
    }

    const headers = generateBuilderHeaders(method, path, body || "")

    return NextResponse.json(headers)
  } catch (error) {
    console.error("Signing error:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate signature",
      },
      { status: 500 },
    )
  }
}
