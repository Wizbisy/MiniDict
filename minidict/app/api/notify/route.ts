import { NextRequest, NextResponse } from "next/server"
import { getRedisClient } from "@/lib/redis"

import { decodeActionMask } from "@/lib/types"
import { waitForTxReceipt } from "@/lib/contracts"
import { decodeEventLog } from "viem"
import { QUEST_ROUTER_ABI } from "@/lib/contract-abi"

export async function POST(request: NextRequest) {
  try {
    const { txHash } = await request.json()

    if (!txHash) {
      return NextResponse.json({ error: "Missing txHash" }, { status: 400 })
    }

    const txStatus = await waitForTxReceipt(txHash)
    if (!txStatus.success || !txStatus.receipt) {
      return NextResponse.json({ error: "Transaction not confirmed on-chain" }, { status: 400 })
    }

    let questCreatedEvent: any = null;
    for (const log of txStatus.receipt.logs) {
      try {
        const decoded = decodeEventLog({ abi: QUEST_ROUTER_ABI, data: log.data, topics: log.topics });
        if (decoded.eventName === "QuestCreated") questCreatedEvent = decoded.args;
      } catch (e) {}
    }

    if (!questCreatedEvent) {
      return NextResponse.json({ error: "Not a valid Quest Creation transaction" }, { status: 400 })
    }

    const questId = Number(questCreatedEvent.questId)
    const rawActionMask = Number(questCreatedEvent.actionMask)
    const actions = decodeActionMask(rawActionMask)
    const payoutRaw = Number(questCreatedEvent.payoutPerClaim)
    const deadline = Number(questCreatedEvent.deadline)

    const redis = await getRedisClient()
    const alreadyNotified = await redis.sIsMember("notified_quests_set", questId.toString())
    if (alreadyNotified) {
      return NextResponse.json({ success: true, message: "Quest already notified. Skipping." })
    }

    const actionTypesLabel = actions.map(a => String(a).charAt(0).toUpperCase() + String(a).slice(1)).join(" + ")
    const payoutVal = payoutRaw / 1e6;
    const payout = payoutVal < 0.01 ? payoutVal.toFixed(4) : payoutVal.toFixed(2)

    const endFormat = new Date(Number(deadline) * 1000).toLocaleString('en-US', { 
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
    const tokenObjectsByUrl: Record<string, string[]> = {}

    for (const item of rawTokens) {
      try {
        const { url, token } = JSON.parse(item)
        if (!groupedTokens[url]) {
          groupedTokens[url] = []
          tokenObjectsByUrl[url] = []
        }
        groupedTokens[url].push(token)
        tokenObjectsByUrl[url].push(item)
      } catch (e) {
      }
    }

    const title = "New Minidict Quest!"
    const body = `Earn $${payout} USDC by completing a new ${actionTypesLabel} quest! Ends ${endFormat}.`
    
    const targetUrl = process.env.PUBLIC_URL
    const results: Array<{ url: string; ok: boolean; status: number; responseBody?: any }> = []
    const invalidTokenObjects: string[] = []

    for (const [notificationUrl, tokens] of Object.entries(groupedTokens)) {
      const payload = {
        notificationId: `quest-creation-${questId}`,
        title,
        body,
        targetUrl,
        tokens
      }

      try {
        const res = await fetch(notificationUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload)
        })

        let responseBody: any = null
        try {
          responseBody = await res.json()
        } catch {
          responseBody = null
        }

        results.push({ url: notificationUrl, ok: res.ok, status: res.status, responseBody })

        if (!res.ok && res.status >= 400 && res.status < 500) {
          invalidTokenObjects.push(...(tokenObjectsByUrl[notificationUrl] || []))
        }
      } catch (err) {
        console.error(`Failed to notify ${notificationUrl}:`, err)
        results.push({ url: notificationUrl, ok: false, status: 0, responseBody: "network_error" })
      }
    }

    if (invalidTokenObjects.length > 0) {
      await redis.sRem("farcaster_notification_tokens", invalidTokenObjects)
    }

    const successCount = results.filter((r) => r.ok).length
    if (successCount > 0) {
      await redis.sAdd("notified_quests_set", questId.toString())
    }

    return NextResponse.json({
      success: successCount > 0,
      recipients: rawTokens.length,
      deliveredEndpoints: successCount,
      failedEndpoints: results.length - successCount,
      details: results,
    })
  } catch (error) {
    console.error("Notification broadcast error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
