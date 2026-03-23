import { NextResponse } from "next/server"
import { getQuestVaultBalance } from "@/lib/contracts"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const questId = Number.parseInt(searchParams.get("questId") || "", 10)

  if (!Number.isFinite(questId)) {
    return NextResponse.json({ balance: 0 }, { status: 400 })
  }

  try {
    const balance = await getQuestVaultBalance(questId)
    return NextResponse.json({ balance })
  } catch (error) {
    console.error("Failed to fetch vault balance:", error)
    return NextResponse.json({ balance: 0 }, { status: 500 })
  }
}
