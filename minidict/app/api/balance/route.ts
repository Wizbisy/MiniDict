import { type NextRequest, NextResponse } from "next/server"

// USDC contract addresses
const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"
const USDC_POLYGON = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"

// ERC20 balanceOf ABI
const BALANCE_OF_ABI = "0x70a08231"

async function getERC20Balance(rpcUrl: string, tokenAddress: string, walletAddress: string): Promise<number> {
  const paddedAddress = walletAddress.slice(2).toLowerCase().padStart(64, "0")
  const data = `${BALANCE_OF_ABI}${paddedAddress}`

  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to: tokenAddress, data }, "latest"],
    }),
  })

  const result = await response.json()
  if (result.result && result.result !== "0x") {
    const balanceWei = BigInt(result.result)
    return Number(balanceWei) / 1e6 // USDC has 6 decimals
  }
  return 0
}

async function getNativeBalance(rpcUrl: string, walletAddress: string): Promise<number> {
  const response = await fetch(rpcUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_getBalance",
      params: [walletAddress, "latest"],
    }),
  })

  const result = await response.json()
  if (result.result) {
    const balanceWei = BigInt(result.result)
    return Number(balanceWei) / 1e18
  }
  return 0
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 })
  }

  try {
    const BASE_RPC = "https://mainnet.base.org"
    const POLYGON_RPC = "https://polygon-rpc.com"

  
    const [usdcBase, usdcPolygon, ethBase, maticPolygon] = await Promise.all([
      getERC20Balance(BASE_RPC, USDC_BASE, address),
      getERC20Balance(POLYGON_RPC, USDC_POLYGON, address),
      getNativeBalance(BASE_RPC, address),
      getNativeBalance(POLYGON_RPC, address),
    ])

    return NextResponse.json({
      base: {
        usdc: usdcBase,
        eth: ethBase,
      },
      polygon: {
        usdc: usdcPolygon,
        matic: maticPolygon,
      },
      total: {
        usdc: usdcBase + usdcPolygon,
      },
    })
  } catch (error) {
    console.error("Balance fetch error:", error)
    return NextResponse.json({
      base: { usdc: 0, eth: 0 },
      polygon: { usdc: 0, matic: 0 },
      total: { usdc: 0 },
    })
  }
}
