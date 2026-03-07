import { NextRequest, NextResponse } from "next/server"
import { kv } from "@vercel/kv"
import { parseWebhookEvent, verifyAppKeyWithNeynar } from "@farcaster/miniapp-node"

export async function GET() {
  return NextResponse.json({ status: "Webhook endpoint is active" }, { status: 200 })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    let payloadResult;
    try {
      payloadResult = await parseWebhookEvent(body, verifyAppKeyWithNeynar)
    } catch (e) {
      console.error("🚫 Invalid Farcaster webhook signature:", e)
      return NextResponse.json({ error: "Invalid cryptographic signature" }, { status: 401 })
    }

    const { event } = payloadResult

    if (!event || !event.event) {
      return NextResponse.json({ error: "Missing required notification fields" }, { status: 400 })
    }

    const eventName = event.event
    
    if (eventName === "miniapp_removed" || eventName === "notifications_disabled") {
      return NextResponse.json({ success: true })
    }

    if (!("notificationDetails" in event) || !event.notificationDetails) {
      return NextResponse.json({ error: "No notification details provided" }, { status: 400 })
    }

    const { url, token } = event.notificationDetails

    if (!url || !token) {
      return NextResponse.json({ error: "Missing required URL or token" }, { status: 400 })
    }

    const tokenObject = JSON.stringify({ url, token })

    if (eventName === "miniapp_added" || eventName === "notifications_enabled") {
      await kv.sadd("farcaster_notification_tokens", tokenObject)
      console.log("✅ Secure Farcaster Notification Token added:", token)
    } 

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Webhook processing error:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
