import { NextRequest, NextResponse } from "next/server"
import { getRedisClient } from "@/lib/redis"
import { parseWebhookEvent, verifyAppKeyWithNeynar } from "@farcaster/miniapp-node"

export async function GET() {
  return NextResponse.json({ status: "Webhook endpoint is active" }, { status: 200 })
}

export async function POST(request: NextRequest) {
  console.log("🔔 WEBHOOK RECEIVED")
  try {
    const body = await request.json()
    console.log("🔔 WEBHOOK BODY:", JSON.stringify(body, null, 2))
    
    let event: any;
    let decodedPayload: any = null;
    try {
      const payloadStr = Buffer.from(body.payload, "base64url").toString("utf-8");
      decodedPayload = JSON.parse(payloadStr);
      console.log("🔔 DECODED WEBHOOK PAYLOAD:", JSON.stringify(decodedPayload, null, 2));
    } catch(e) {}
    
    // Check if it's the Coinbase Base App structure (bypass Neynar verification)
    if (decodedPayload?.event?.notificationDetails?.url?.includes("coinbase.com")) {
      console.log("🔔 DETECTED BASE APP PAYLOAD (Bypassing Neynar Signature Check)")
      event = decodedPayload.event
    } else {
      try {
        console.log("🔔 VERIFYING SIGNATURE WITH NEYNAR...")
        const payloadResult = await parseWebhookEvent(body, verifyAppKeyWithNeynar)
        event = payloadResult.event
        console.log("🔔 SIGNATURE VERIFIED SUCCESSFULLY!")
      } catch (e) {
        console.error("🚫 Invalid Farcaster webhook signature:", e)
        return NextResponse.json({ error: "Invalid cryptographic signature" }, { status: 401 })
      }
    }

    if (!event || !event.event) {
      return NextResponse.json({ error: "Missing required notification fields" }, { status: 400 })
    }

    console.log("🔔 EVENT DETAILS:", JSON.stringify(event, null, 2))

    const eventName = event.event
    
    if (eventName === "miniapp_removed" || eventName === "notifications_disabled") {
      console.log(`🔔 USER REMOVED/DISABLED APP (${eventName})`)
      return NextResponse.json({ success: true })
    }

    if (!("notificationDetails" in event) || !event.notificationDetails) {
      console.log("🔔 NO NOTIFICATION DETAILS FOUND IN EVENT")
      return NextResponse.json({ error: "No notification details provided" }, { status: 400 })
    }

    const { url, token } = event.notificationDetails
    console.log("🔔 EXTRACTED TARGET:", url)

    if (!url || !token) {
      console.error("🔔 INVALID PAYLOAD: Missing URL or token")
      return NextResponse.json({ error: "Missing required URL or token" }, { status: 400 })
    }

    const tokenObject = JSON.stringify({ url, token })

    if (eventName === "miniapp_added" || eventName === "notifications_enabled") {
      try {
        console.log("🔔 ATTEMPTING KV SAVE TO 'farcaster_notification_tokens'")
        const redis = await getRedisClient()
        await redis.sAdd("farcaster_notification_tokens", tokenObject)
        console.log("✅ Secure Farcaster Notification Token added:", token)
      } catch (kvError) {
        console.error("🔴 KV DATABASE ERROR:", kvError)
      }
    } 

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}