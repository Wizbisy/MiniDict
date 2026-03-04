import { NextResponse } from "next/server"
import { getAllQuests } from "@/lib/contracts"

export async function GET() {
  try {
    const quests = await getAllQuests()
    return NextResponse.json(quests)
  } catch (error) {
    console.error("Failed to fetch quests:", error)
    return NextResponse.json([])
  }
}
