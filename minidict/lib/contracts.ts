import { CONTRACTS, BASE_RPC } from "./contract-abi"
import type { EngagementMarket, UserBet, MetricType } from "./types"

const SELECTORS = {
  marketCount:      "0xec979082", 
  getMarket:        "0xeb44fdd3", 
  getUserBet:       "0xc03fb87c", 
  getUserMarketIds: "0x059cf043", 
  placeBet:         "0x1a38cac6", 
  claimWinnings:    "0x677bd9ff", 
  approve:          "0x095ea7b3", 
  allowance:        "0xdd62ed3e", 
} as const


function encodeUint256(value: number | bigint): string {
  return BigInt(value).toString(16).padStart(64, "0")
}

function encodeAddress(value: string): string {
  return value.slice(2).toLowerCase().padStart(64, "0")
}

function encodeBool(value: boolean): string {
  return value ? "0".repeat(63) + "1" : "0".repeat(64)
}

function decodeUint256(hex: string, offset: number): bigint {
  return BigInt("0x" + hex.slice(offset, offset + 64))
}

function decodeBool(hex: string, offset: number): boolean {
  return hex.slice(offset, offset + 64) !== "0".repeat(64)
}

function decodeAddress(hex: string, offset: number): string {
  return "0x" + hex.slice(offset + 24, offset + 64)
}


async function ethCall(to: string, data: string): Promise<string> {
  const response = await fetch(BASE_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_call",
      params: [{ to, data }, "latest"],
    }),
  })
  const result = await response.json()
  if (result.error) {
    throw new Error(result.error.message || "eth_call failed")
  }
  return result.result || "0x"
}


const METRIC_TYPES: MetricType[] = ["likes", "recasts", "replies", "followers"]

export async function getMarketCount(): Promise<number> {
  const result = await ethCall(CONTRACTS.PREDICTION_MARKET, SELECTORS.marketCount)
  if (result === "0x" || result.length < 66) return 0
  return Number(BigInt(result))
}

export async function getMarket(marketId: number): Promise<EngagementMarket | null> {
  try {
    const data = SELECTORS.getMarket + encodeUint256(marketId)
    const result = await ethCall(CONTRACTS.PREDICTION_MARKET, data)

    if (result === "0x" || result.length < 66) return null

    const hex = result.slice(2)


    const tupleStart = 64 

    const id = Number(decodeUint256(hex, tupleStart + 0))
    const castHashOffset = Number(decodeUint256(hex, tupleStart + 64)) 
    const metricType = Number(decodeUint256(hex, tupleStart + 128))
    const targetValue = Number(decodeUint256(hex, tupleStart + 192))
    const deadline = Number(decodeUint256(hex, tupleStart + 256))
    const totalYesRaw = decodeUint256(hex, tupleStart + 320)
    const totalNoRaw = decodeUint256(hex, tupleStart + 384)
    const resolved = decodeBool(hex, tupleStart + 448)
    const outcome = resolved ? decodeBool(hex, tupleStart + 512) : null
    const creator = decodeAddress(hex, tupleStart + 576)
    const stringDataPos = tupleStart + castHashOffset * 2
    const strLen = Number(decodeUint256(hex, stringDataPos))
    const strHex = hex.slice(stringDataPos + 64, stringDataPos + 64 + strLen * 2)
    let castHash = ""
    for (let i = 0; i < strHex.length; i += 2) {
      castHash += String.fromCharCode(parseInt(strHex.slice(i, i + 2), 16))
    }

    return {
      id,
      castHash,
      castAuthor: "",
      castAuthorPfp: "",
      castText: "",
      metricType: METRIC_TYPES[metricType] || "likes",
      targetValue,
      currentValue: 0,
      deadline,
      totalYesAmount: Number(totalYesRaw) / 1e6,
      totalNoAmount: Number(totalNoRaw) / 1e6,
      resolved,
      outcome,
      creator,
    }
  } catch (error) {
    console.error(`Failed to get market ${marketId}:`, error)
    return null
  }
}

export async function getAllMarkets(): Promise<EngagementMarket[]> {
  try {
    const count = await getMarketCount()
    if (count === 0) return []

    const markets = await Promise.all(
      Array.from({ length: count }, (_, i) => getMarket(i))
    )

    return markets.filter((m): m is EngagementMarket => m !== null)
  } catch (error) {
    console.error("Failed to get markets:", error)
    return []
  }
}

export async function getUserBets(address: string): Promise<UserBet[]> {
  try {
    const data = SELECTORS.getUserMarketIds + encodeAddress(address)
    const result = await ethCall(CONTRACTS.PREDICTION_MARKET, data)

    if (result === "0x" || result.length < 130) return []

    const hex = result.slice(2)
    const arrayOffset = Number(decodeUint256(hex, 0)) * 2
    const length = Number(decodeUint256(hex, arrayOffset))
    const bets: UserBet[] = []

    for (let i = 0; i < length; i++) {
      const marketId = Number(decodeUint256(hex, arrayOffset + 64 + i * 64))

      const betData = SELECTORS.getUserBet + encodeUint256(marketId) + encodeAddress(address)
      const betResult = await ethCall(CONTRACTS.PREDICTION_MARKET, betData)

      if (betResult !== "0x" && betResult.length >= 194) {
        const betHex = betResult.slice(2)
        const yesAmount = Number(decodeUint256(betHex, 0)) / 1e6
        const noAmount = Number(decodeUint256(betHex, 64)) / 1e6
        const claimed = decodeBool(betHex, 128)

        if (yesAmount > 0) {
          bets.push({ marketId, prediction: true, amount: yesAmount, claimed })
        }
        if (noAmount > 0) {
          bets.push({ marketId, prediction: false, amount: noAmount, claimed })
        }
      }
    }

    return bets
  } catch (error) {
    console.error("Failed to get user bets:", error)
    return []
  }
}


export function buildApproveUSDCTx(amount: number): { to: string; data: string } {
  const amountWei = BigInt(Math.floor(amount * 1e6))
  const data = SELECTORS.approve + encodeAddress(CONTRACTS.PREDICTION_MARKET) + encodeUint256(amountWei)
  return { to: CONTRACTS.USDC, data }
}

export function buildPlaceBetTx(marketId: number, prediction: boolean, amount: number): { to: string; data: string } {
  const amountWei = BigInt(Math.floor(amount * 1e6))
  const data = SELECTORS.placeBet + encodeUint256(marketId) + encodeBool(prediction) + encodeUint256(amountWei)
  return { to: CONTRACTS.PREDICTION_MARKET, data }
}

export function buildClaimWinningsTx(marketId: number): { to: string; data: string } {
  const data = SELECTORS.claimWinnings + encodeUint256(marketId)
  return { to: CONTRACTS.PREDICTION_MARKET, data }
}

export async function checkAllowance(owner: string): Promise<number> {
  try {
    const data = SELECTORS.allowance + encodeAddress(owner) + encodeAddress(CONTRACTS.PREDICTION_MARKET)
    const result = await ethCall(CONTRACTS.USDC, data)
    if (result === "0x") return 0
    return Number(BigInt(result)) / 1e6
  } catch {
    return 0
  }
}
