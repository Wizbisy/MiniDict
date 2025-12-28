import crypto from "crypto"

// Builder API credentials from environment
const BUILDER_API_KEY = process.env.POLY_BUILDER_API_KEY || ""
const BUILDER_SECRET = process.env.POLY_BUILDER_SECRET || ""
const BUILDER_PASSPHRASE = process.env.POLY_BUILDER_PASSPHRASE || ""

const CLOB_HOST = "https://clob.polymarket.com"
const CHAIN_ID = 137 // Polygon mainnet

export interface BuilderCredentials {
  key: string
  secret: string
  passphrase: string
}

export interface OrderParams {
  tokenId: string
  price: number
  size: number
  side: "BUY" | "SELL"
  funderAddress: string
}

export interface SignedOrder {
  order: OrderParams
  signature: string
  timestamp: number
}

// Build HMAC signature for builder authentication
export function buildHmacSignature(
  secret: string,
  timestamp: number,
  method: string,
  path: string,
  body: string,
): string {
  const message = `${timestamp}${method}${path}${body}`
  const hmac = crypto.createHmac("sha256", Buffer.from(secret, "base64"))
  hmac.update(message)
  return hmac.digest("base64")
}

// Generate builder authentication headers
export function generateBuilderHeaders(method: string, path: string, body = ""): Record<string, string> {
  const timestamp = Date.now().toString()

  if (!BUILDER_SECRET || !BUILDER_API_KEY || !BUILDER_PASSPHRASE) {
    throw new Error("Builder credentials not configured")
  }

  const signature = buildHmacSignature(BUILDER_SECRET, Number.parseInt(timestamp), method, path, body)

  return {
    POLY_BUILDER_SIGNATURE: signature,
    POLY_BUILDER_TIMESTAMP: timestamp,
    POLY_BUILDER_API_KEY: BUILDER_API_KEY,
    POLY_BUILDER_PASSPHRASE: BUILDER_PASSPHRASE,
  }
}

// Post order to CLOB with builder attribution
export async function postOrderWithAttribution(
  order: SignedOrder,
  userApiKey: string,
  userPassphrase: string,
  userSignature: string,
): Promise<{ success: boolean; orderId?: string; error?: string }> {
  const path = "/order"
  const body = JSON.stringify(order)
  const method = "POST"

  try {
    const builderHeaders = generateBuilderHeaders(method, path, body)

    const response = await fetch(`${CLOB_HOST}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        POLY_ADDRESS: order.order.funderAddress,
        POLY_API_KEY: userApiKey,
        POLY_PASSPHRASE: userPassphrase,
        POLY_SIGNATURE: userSignature,
        POLY_TIMESTAMP: order.timestamp.toString(),
        ...builderHeaders,
      },
      body,
    })

    if (!response.ok) {
      const errorData = await response.json()
      return { success: false, error: errorData.message || "Order failed" }
    }

    const data = await response.json()
    return { success: true, orderId: data.orderID }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

// Fetch user API credentials via L1 authentication
export async function deriveApiCredentials(
  address: string,
  signature: string,
  timestamp: number,
  nonce = 0,
): Promise<{ apiKey: string; secret: string; passphrase: string } | null> {
  try {
    const response = await fetch(`${CLOB_HOST}/auth/derive-api-key`, {
      method: "GET",
      headers: {
        POLY_ADDRESS: address,
        POLY_SIGNATURE: signature,
        POLY_TIMESTAMP: timestamp.toString(),
        POLY_NONCE: nonce.toString(),
      },
    })

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

// Get current orderbook for a market
export async function getOrderbook(tokenId: string): Promise<{
  bids: Array<{ price: string; size: string }>
  asks: Array<{ price: string; size: string }>
} | null> {
  try {
    const response = await fetch(`${CLOB_HOST}/book?token_id=${tokenId}`)

    if (!response.ok) {
      return null
    }

    return await response.json()
  } catch {
    return null
  }
}

// Get market price
export async function getMarketPrice(tokenId: string): Promise<{
  bid: number
  ask: number
  mid: number
} | null> {
  try {
    const response = await fetch(`${CLOB_HOST}/price?token_id=${tokenId}`)

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    return {
      bid: Number.parseFloat(data.bid || "0"),
      ask: Number.parseFloat(data.ask || "0"),
      mid: Number.parseFloat(data.mid || "0"),
    }
  } catch {
    return null
  }
}
