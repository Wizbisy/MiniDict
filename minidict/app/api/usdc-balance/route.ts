import { NextResponse } from "next/server"
import { getUSDCBalance } from "@/lib/contracts"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ balance: 0 }, { status: 400 })
  }

  try {
    const balance = await getUSDCBalance(address)
    return NextResponse.json({ balance })
  } catch (error) {
    console.error("Failed to fetch USDC balance:", error)
    return NextResponse.json({ balance: 0 }, { status: 500 })
  }
}
