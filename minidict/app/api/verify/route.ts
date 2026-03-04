import { type NextRequest, NextResponse } from "next/server"
import { getFidFromAddress, getAddressesForFid, verifyAction } from "@/lib/farcaster"
import { getQuest, hasUserClaimed } from "@/lib/contracts"


export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const questId = searchParams.get("questId")
  const address = searchParams.get("address")
  const fid = searchParams.get("fid")

  if (!questId || !address) {
    return NextResponse.json({ error: "questId and address required" }, { status: 400 })
  }

  try {
    const quest = await getQuest(parseInt(questId))
    if (!quest) {
      return NextResponse.json({ verified: false, reason: "Quest not found" })
    }

    if (quest.creator.toLowerCase() === address.toLowerCase()) {
      return NextResponse.json({ verified: false, reason: "You cannot claim your own quest" })
    }

    const userFid = fid ? parseInt(fid) : await getFidFromAddress(address)
    if (!userFid) {
      return NextResponse.json({ verified: false, reason: "Farcaster account not found for this wallet" })
    }

    const linkedAddresses = await getAddressesForFid(userFid)
    for (const addr of linkedAddresses) {
      const claimed = await hasUserClaimed(parseInt(questId), addr)
      if (claimed) {
        return NextResponse.json({ verified: false, reason: "Already claimed from a linked wallet" })
      }
    }

    const result = await verifyAction(quest.actionType, quest.targetIdentifier, userFid)
    return NextResponse.json(result)
  } catch {
    return NextResponse.json({ verified: false, reason: "Verification check failed" })
  }
}
