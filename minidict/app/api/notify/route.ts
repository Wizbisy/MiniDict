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

    let quest: any = null
    for (let i = 0; i < 4; i++) {
        quest = await getQuest(questId)
        if (quest && Number(quest.deadline) > 0) {
            break;
        }
        await new Promise(r => setTimeout(r, 1500))
    }

    if (!quest || Number(quest.deadline) === 0) {
      return NextResponse.json({ error: "Quest not found on-chain (RPC sync delayed)" }, { status: 404 })
    }

    const redis = await getRedisClient()
    const addedCount = await redis.sAdd("notified_quests_set", questId.toString())
    if (addedCount === 0) {
      return NextResponse.json({ success: true, message: "Quest already notified. Skipping." })
    }

    const actionType = String(quest.actionType)
    const payoutVal = Number(quest.payoutPerClaim)
    const payout = payoutVal < 0.01 ? payoutVal.toFixed(4) : payoutVal.toFixed(2)

    const endFormat = new Date(Number(quest.deadline) * 1000).toLocaleString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit' 
    })

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
    const body = `Earn $${payout} USDC by completing a new ${actionType} quest! Ends ${endFormat}.`
    
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
