import { NextResponse } from "next/server"

const ALLOWED_METHODS = new Set(["eth_call", "eth_getBalance", "eth_getTransactionReceipt"])
const ETH_CALL_CACHE_TTL_MS = 5000
const INTERNAL_RPC_KEY = process.env.INTERNAL_RPC_KEY
const RPC_URLS = ((process.env.BASE_RPC_URLS || process.env.BASE_RPC_URL || "") as string)
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean)

let rpcCursor = 0

function getNextRpcUrl(): string {
  if (RPC_URLS.length === 0) return ""
  const url = RPC_URLS[rpcCursor % RPC_URLS.length]
  rpcCursor = (rpcCursor + 1) % RPC_URLS.length
  return url
}

type RpcPayload = {
  jsonrpc?: string
  id?: number | string
  method?: string
  params?: unknown[]
}

type CacheEntry = {
  result: unknown
  expiresAt: number
}

const ethCallCache = new Map<string, CacheEntry>()
const inflightEthCall = new Map<string, Promise<unknown>>()

function buildEthCallCacheKey(payload: RpcPayload): string | null {
  const [tx, blockTag] = payload.params ?? []
  if (!tx || typeof tx !== "object") return null
  const { to, data } = tx as { to?: string; data?: string }
  if (!to || !data) return null
  return `${String(to).toLowerCase()}:${String(data).toLowerCase()}:${String(blockTag ?? "latest")}`
}

export async function POST(request: Request) {
  try {
    if (!INTERNAL_RPC_KEY) {
      return NextResponse.json(
        { error: { message: "INTERNAL_RPC_KEY is not configured" } },
        { status: 500 }
      )
    }

    const providedKey = request.headers.get("x-internal-rpc-key")
    if (!providedKey || providedKey !== INTERNAL_RPC_KEY) {
      return NextResponse.json(
        { error: { message: "Unauthorized" } },
        { status: 401 }
      )
    }

    const rpcUrl = getNextRpcUrl()
    if (!rpcUrl) {
      return NextResponse.json(
        { error: { message: "BASE_RPC_URL/BASE_RPC_URLS is not configured" } },
        { status: 500 }
      )
    }

    const payload = (await request.json()) as RpcPayload
    const method = payload?.method

    if (!method || !ALLOWED_METHODS.has(method)) {
      return NextResponse.json(
        { error: { message: "RPC method not allowed" } },
        { status: 400 }
      )
    }

    let result: unknown

    if (method === "eth_call") {
      const key = buildEthCallCacheKey(payload)

      if (key) {
        const now = Date.now()
        const cached = ethCallCache.get(key)
        if (cached && cached.expiresAt > now) {
          return NextResponse.json(cached.result)
        }

        const inflight = inflightEthCall.get(key)
        if (inflight) {
          result = await inflight
          return NextResponse.json(result)
        }

        const upstreamPromise = (async () => {
          const upstream = await fetch(rpcUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            cache: "no-store",
          })
          if (!upstream.ok) {
            throw new Error(`Upstream RPC error: ${upstream.status}`)
          }
          return upstream.json()
        })()

        inflightEthCall.set(key, upstreamPromise)

        try {
          result = await upstreamPromise
          ethCallCache.set(key, {
            result,
            expiresAt: now + ETH_CALL_CACHE_TTL_MS,
          })
          return NextResponse.json(result)
        } finally {
          inflightEthCall.delete(key)
        }
      }
    }

    const upstream = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    })

    result = await upstream.json()
    return NextResponse.json(result, { status: upstream.ok ? 200 : upstream.status })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Proxy request failed"
    return NextResponse.json({ error: { message } }, { status: 500 })
  }
}
