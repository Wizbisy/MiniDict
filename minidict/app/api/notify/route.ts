import { NextRequest, NextResponse } from "next/server"
import { getRedisClient } from "@/lib/redis"

import { getQuest } from "@/lib/contracts"
import { actionTypeFromIndex } from "@/lib/types"

export async function POST(request: NextRequest) {
  try {
    const { questId } = await request.json()

    if (questId === undefined || questId === null) {
      return NextResponse.json({ error: "Missing questId" }, { status: 400 })
    }

    const quest = await getQuest(questId)
    if (!quest) {
      return NextResponse.json({ error: "Quest not found on-chain" }, { status: 404 })
    }

    const redis = await getRedisClient()
    const addedCount = await redis.sAdd("notified_quests_set", questId.toString())
    if (addedCount === 0) {
      return NextResponse.json({ success: true, message: "Quest already notified. Skipping." })
    }

    const actionType = actionTypeFromIndex(Number(quest.actionType))
    const payoutRaw = Number(quest.payoutPerClaim) / 1e6
    const payout = payoutRaw < 0.01 ? payoutRaw.toFixed(4) : payoutRaw.toFixed(2)

    const rawTokens: string[] = await redis.sMembers("farcaster_notification_tokens") || []
    
    if (rawTokens.length === 0) {
      return NextResponse.json({ success: true, message: "No users have opted in to notifications yet." })
    }

    const groupedTokens: Record<string, string[]> = {}

    for (const item of rawTokens) {
      try {
        const { url, token } = JSON.parse(item)
        if (!groupedTokens[url]) {
          groupedTokens[url] = []
        }
        groupedTokens[url].push(token)
      } catch (e) {
      }
    }

    const title = "New Minidict Quest!"
    const body = `Earn $${payout} USDC by completing a new ${actionType} quest!`
    
    const targetUrl = process.env.PUBLIC_URL
    const promises = []
    for (const [notificationUrl, tokens] of Object.entries(groupedTokens)) {
      const payload = {
        notificationId: `quest-creation-${questId}`,
        title,
        body,
        targetUrl,
        tokens
      }

      promises.push(
        fetch(notificationUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload)
        }).then(res => res.json()).catch(err => console.error(`Failed to notify ${notificationUrl}:`, err))
      )
    }

    await Promise.all(promises)

    return NextResponse.json({ success: true, recipients: rawTokens.length })
  } catch (error) {
    console.error("Notification broadcast error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
