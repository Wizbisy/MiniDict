import { NextResponse } from "next/server"
import { checkAllowance } from "@/lib/contracts"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const owner = searchParams.get("owner")

  if (!owner) {
    return NextResponse.json({ allowance: 0 }, { status: 400 })
  }

  try {
    const allowance = await checkAllowance(owner)
    return NextResponse.json({ allowance })
  } catch (error) {
    console.error("Failed to fetch allowance:", error)
    return NextResponse.json({ allowance: 0 }, { status: 500 })
  }
}
