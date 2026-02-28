import { type NextRequest, NextResponse } from "next/server"

const USDC_BASE = "0x036CbD53842c5426634e7929541eC2318f3dCF7e"

const BALANCE_OF_ABI = "0x70a08231"

const BASE_RPC = "https://sepolia.base.org"

async function getERC20Balance(tokenAddress: string, walletAddress: string): Promise<number> {
  const paddedAddress = walletAddress.slice(2).toLowerCase().padStart(64, "0")
  const data = `${BALANCE_OF_ABI}${paddedAddress}`

  const response = await fetch(BASE_RPC, {
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
    return Number(balanceWei) / 1e6 
  }
  return 0
}

async function getNativeBalance(walletAddress: string): Promise<number> {
  const response = await fetch(BASE_RPC, {
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
    const [usdc, eth] = await Promise.all([
      getERC20Balance(USDC_BASE, address),
      getNativeBalance(address),
    ])

    return NextResponse.json({ usdc, eth })
  } catch (error) {
    console.error("Balance fetch error:", error)
    return NextResponse.json({ usdc: 0, eth: 0 })
  }
}
