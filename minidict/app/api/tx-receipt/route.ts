import { NextResponse } from "next/server"
import { waitForTxReceipt } from "@/lib/contracts"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const txHash = searchParams.get("txHash")
  const maxAttemptsParam = Number.parseInt(searchParams.get("maxAttempts") || "", 10)
  const maxAttempts = Number.isFinite(maxAttemptsParam) ? maxAttemptsParam : 30

  if (!txHash) {
    return NextResponse.json(
      { success: false, error: "txHash is required" },
      { status: 400 }
    )
  }

  try {
    const result = await waitForTxReceipt(txHash, maxAttempts)
    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch receipt"
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
