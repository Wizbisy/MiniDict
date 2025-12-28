import { NextResponse } from "next/server"
import { generateBuilderHeaders } from "@/lib/polymarket-clob"

const CLOB_HOST = process.env.CLOB_HOST || "https://clob.polymarket.com"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { order, userAddress, userSignature, userTimestamp, userNonce } = body

    if (!order || !userAddress) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const path = "/order"
    const method = "POST"
    const orderBody = JSON.stringify(order)

    // Generate builder authentication headers using env credentials
    let builderHeaders: Record<string, string> = {}
    try {
      builderHeaders = generateBuilderHeaders(method, path, orderBody)
    } catch (error) {
      console.error("[v0] Builder credentials error:", error)
      return NextResponse.json(
        {
          error:
            "Builder credentials not configured. Add POLY_BUILDER_API_KEY, POLY_BUILDER_SECRET, and POLY_BUILDER_PASSPHRASE to environment variables.",
          code: "MISSING_CREDENTIALS",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Sending order to CLOB:", {
      host: CLOB_HOST,
      order,
      userAddress,
      hasBuilderAuth: Object.keys(builderHeaders).length > 0,
    })

    // Forward order to Polymarket CLOB
    const response = await fetch(`${CLOB_HOST}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Minidict/1.0",
        POLY_ADDRESS: userAddress,
        POLY_SIGNATURE: userSignature || "",
        POLY_TIMESTAMP: userTimestamp?.toString() || Date.now().toString(),
        POLY_NONCE: userNonce?.toString() || "0",
        ...builderHeaders,
      },
      body: orderBody,
    })

    console.log("[v0] CLOB response status:", response.status)

    const contentType = response.headers.get("content-type") || ""
    if (!contentType.includes("application/json")) {
      const text = await response.text()
      console.error(`[v0] CLOB error - status ${response.status}:`, text.slice(0, 500))

      // If blocked by Cloudflare
      if (response.status === 403) {
        return NextResponse.json(
          {
            error:
              "API access blocked. This usually means the server IP is not whitelisted by Polymarket. Deploy to a whitelisted server or contact Polymarket for builder access.",
            code: "ACCESS_BLOCKED",
          },
          { status: 403 },
        )
      }

      return NextResponse.json(
        {
          error: `CLOB API error (${response.status}). Please try again.`,
          status: response.status,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    console.log("[v0] CLOB response data:", data)

    if (!response.ok) {
      return NextResponse.json(
        { error: data.message || data.error || "Order placement failed" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      orderId: data.orderID || data.id,
      ...data,
    })
  } catch (error) {
    console.error("[v0] Order API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    )
  }
}
