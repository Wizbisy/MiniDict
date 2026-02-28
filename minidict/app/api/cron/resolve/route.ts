import { NextResponse } from "next/server"
import { getAllMarkets } from "@/lib/contracts"
import { getCastByHash, getEngagementValue } from "@/lib/farcaster"
import { BASE_RPC, CONTRACTS } from "@/lib/contract-abi"
import { signTransaction, getAddressFromPrivateKey, functionSelector } from "@/lib/signer"

function encodeUint256(value: number | bigint): string {
  return BigInt(value).toString(16).padStart(64, "0")
}

async function sendSignedTx(to: string, data: string): Promise<{ success: boolean; hash?: string; error?: string }> {
  const privateKey = process.env.ADMIN_PRIVATE_KEY
  if (!privateKey) {
    return { success: false, error: "ADMIN_PRIVATE_KEY not configured" }
  }

  try {
    const adminAddress = getAddressFromPrivateKey(privateKey)

    const nonceRes = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "eth_getTransactionCount",
        params: [adminAddress, "latest"],
      }),
    })
    const nonce = (await nonceRes.json()).result

    const gasPriceRes = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_gasPrice", params: [] }),
    })
    const gasPrice = (await gasPriceRes.json()).result

    const estimateRes = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "eth_estimateGas",
        params: [{ from: adminAddress, to, data }],
      }),
    })
    const gasEstimate = (await estimateRes.json()).result || "0x50000"

    const rawTx = await signTransaction({
      nonce,
      gasPrice,
      gas: gasEstimate,
      to,
      value: "0x0",
      data,
      chainId: 84532,
    }, privateKey)

    const sendRes = await fetch(BASE_RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1,
        method: "eth_sendRawTransaction",
        params: [rawTx],
      }),
    })
    const sendData = await sendRes.json()

    if (sendData.error) {
      return { success: false, error: sendData.error.message }
    }

    return { success: true, hash: sendData.result }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" }
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const secret = searchParams.get("secret")
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const markets = await getAllMarkets()
    const now = Math.floor(Date.now() / 1000)
    const resolved: { id: number; outcome: boolean; actualValue: number; txHash?: string }[] = []
    const errors: string[] = []
    const selector = functionSelector("resolveMarket(uint256,uint256)")

    for (const market of markets) {
      if (market.resolved || market.deadline > now) continue
      const cast = await getCastByHash(market.castHash)
      if (!cast) {
        errors.push(`Market ${market.id}: Could not fetch cast data for hash ${market.castHash}`)
        continue
      }

      const actualValue = getEngagementValue(cast, market.metricType)
      const outcome = actualValue >= market.targetValue
      const data = selector + encodeUint256(market.id) + encodeUint256(actualValue)
      const result = await sendSignedTx(CONTRACTS.PREDICTION_MARKET, data)

      if (result.success) {
        resolved.push({ id: market.id, outcome, actualValue, txHash: result.hash })
        console.log(`✓ Market ${market.id} resolved: actual=${actualValue}, outcome=${outcome ? "YES" : "NO"}, tx=${result.hash}`)
      } else {
        errors.push(`Market ${market.id}: ${result.error}`)
        console.error(`✗ Market ${market.id} resolve failed: ${result.error}`)
      }
    }

    return NextResponse.json({
      ok: true,
      resolved,
      errors,
      marketsChecked: markets.length,
      pendingResolution: markets.filter(m => !m.resolved && m.deadline <= now).length,
    })
  } catch (error) {
    console.error("Auto-resolve error:", error)
    return NextResponse.json({ error: "Auto-resolve failed" }, { status: 500 })
  }
}
