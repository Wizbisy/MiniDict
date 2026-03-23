import { type NextRequest, NextResponse } from "next/server"

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"

const BALANCE_OF_ABI = "0x70a08231"

function getRpcProxyUrl(requestUrl: string): string {
  const origin = new URL(requestUrl).origin
  return `${origin}/api/rpc`
}

async function rpcRequest(rpcUrl: string, payload: unknown) {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-rpc-key": process.env.INTERNAL_RPC_KEY || "",
    },
    body: JSON.stringify(payload),
  })

  return response.json()
}

async function getERC20Balance(rpcUrl: string, tokenAddress: string, walletAddress: string): Promise<number> {
  const paddedAddress = walletAddress.slice(2).toLowerCase().padStart(64, "0")
  const data = `${BALANCE_OF_ABI}${paddedAddress}`

  const result = await rpcRequest(rpcUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: tokenAddress, data }, "latest"],
  })

  if (result.result && result.result !== "0x") {
    const balanceWei = BigInt(result.result)
    return Number(balanceWei) / 1e6 
  }
  return 0
}

async function getNativeBalance(rpcUrl: string, walletAddress: string): Promise<number> {
  const result = await rpcRequest(rpcUrl, {
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [walletAddress, "latest"],
  })

  if (result.result) {
    const balanceWei = BigInt(result.result)
    return Number(balanceWei) / 1e18
  }
  return 0
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")
  const rpcUrl = getRpcProxyUrl(request.url)

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 })
  }

  try {
    const [usdc, eth] = await Promise.all([
      getERC20Balance(rpcUrl, USDC_BASE, address),
      getNativeBalance(rpcUrl, address),
    ])

    return NextResponse.json({ usdc, eth })
  } catch (error) {
    console.error("Balance fetch error:", error)
    return NextResponse.json({ usdc: 0, eth: 0 })
  }
}
