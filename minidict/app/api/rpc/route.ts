import { NextResponse } from "next/server"

const ALLOWED_METHODS = new Set(["eth_call", "eth_getTransactionReceipt"])

export async function POST(request: Request) {
  try {
    const rpcUrl = process.env.BASE_RPC_URL
    if (!rpcUrl) {
      return NextResponse.json(
        { error: { message: "BASE_RPC_URL is not configured" } },
        { status: 500 }
      )
    }

    const payload = await request.json()
    const method = payload?.method

    if (!method || !ALLOWED_METHODS.has(method)) {
      return NextResponse.json(
        { error: { message: "RPC method not allowed" } },
        { status: 400 }
      )
    }

    const upstream = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    const result = await upstream.json()
    return NextResponse.json(result, { status: upstream.ok ? 200 : upstream.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed"
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}
