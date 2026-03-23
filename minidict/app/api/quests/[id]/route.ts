import { NextResponse } from "next/server"
import { getQuest } from "@/lib/contracts"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const questId = Number.parseInt(id, 10)
    if (!Number.isFinite(questId)) {
      return NextResponse.json(null, { status: 400 })
    }

    const quest = await getQuest(questId)
    return NextResponse.json(quest)
  } catch (error) {
    console.error("Failed to fetch quest:", error)
    return NextResponse.json(null, { status: 500 })
  }
}
