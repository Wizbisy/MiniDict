import { type NextRequest, NextResponse } from "next/server"
import { getFidFromAddress, getAddressesForFid, verifyAction, getUserProfile } from "@/lib/farcaster"
import { getQuest, hasUserClaimed } from "@/lib/contracts"
import { decodeActionMask } from "@/lib/types"


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

    if (quest.minFollowers > 0 || quest.requirePowerBadge) {
      const profile = await getUserProfile(userFid)
      if (!profile) {
        return NextResponse.json({ verified: false, reason: "Failed to load Farcaster profile for requirements check" })
      }
      if (quest.minFollowers > 0 && profile.followerCount < quest.minFollowers) {
        return NextResponse.json({ verified: false, reason: `Requires at least ${quest.minFollowers} followers` })
      }
      if (quest.requirePowerBadge && !profile.powerBadge) {
        return NextResponse.json({ verified: false, reason: "Requires Farcaster Power Badge" })
      }
    }

    const linkedAddresses = await getAddressesForFid(userFid)
    for (const addr of linkedAddresses) {
      const claimed = await hasUserClaimed(parseInt(questId), addr)
      if (claimed) {
        return NextResponse.json({ verified: false, reason: "Already claimed from a linked wallet" })
      }
    }

    const actions = decodeActionMask(quest.actionMask)
    let lastResult = { verified: true, reason: "" }
    for (const action of actions) {
      const result = await verifyAction(action, quest.targetIdentifier, userFid)
      if (!result.verified) {
        return NextResponse.json(result)
      }
      lastResult = result
    }
    return NextResponse.json(lastResult)
  } catch {
    return NextResponse.json({ verified: false, reason: "Verification check failed" })
  }
}
