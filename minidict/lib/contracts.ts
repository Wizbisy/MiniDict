import { CONTRACTS, QUEST_ROUTER_ABI, ERC20_ABI, QUEST_VAULT_ABI } from "./contract-abi"
import { encodeFunctionData } from "viem"
import type { Quest } from "./types"
import { actionTypeFromIndex } from "./types"

const RPC_PROXY_PATH = "/api/rpc"
const INTERNAL_RPC_KEY = process.env.INTERNAL_RPC_KEY

function getServerBaseUrl(): string {
  if (process.env.INTERNAL_API_BASE_URL) return process.env.INTERNAL_API_BASE_URL
  if (process.env.PUBLIC_URL) return process.env.PUBLIC_URL
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return "http://127.0.0.1:3000"
}

function getRpcEndpoint(): string {
  if (typeof window !== "undefined") return RPC_PROXY_PATH
  return `${getServerBaseUrl()}${RPC_PROXY_PATH}`
}

const isBrowserRuntime = typeof window !== "undefined"

async function browserGetJson<T>(path: string): Promise<T> {
  const response = await fetch(path, { cache: "no-store" })
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`)
  }
  return response.json() as Promise<T>
}


async function ethCall(to: string, data: string): Promise<string> {
  const rpcEndpoint = getRpcEndpoint()

  const maxAttempts = 4

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(rpcEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(isBrowserRuntime ? {} : { "x-internal-rpc-key": INTERNAL_RPC_KEY || "" }),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_call",
        params: [{ to, data }, "latest"],
      }),
    })

    const result = await response.json()
    if (!result.error) return result.result || "0x"

    const message = String(result.error?.message || "eth_call failed")
    const isRateLimited = /rate limit|too many requests|429/i.test(message)

    if (!isRateLimited || attempt === maxAttempts) {
      throw new Error(message)
    }

    await new Promise((resolve) => setTimeout(resolve, 250 * 2 ** (attempt - 1)))
  }

  throw new Error("eth_call failed")
}


export async function waitForTxReceipt(txHash: string, maxAttempts = 30): Promise<{ success: boolean; error?: string; receipt?: any }> {
  if (isBrowserRuntime) {
    return browserGetJson<{ success: boolean; error?: string; receipt?: any }>(
      `/api/tx-receipt?txHash=${encodeURIComponent(txHash)}&maxAttempts=${maxAttempts}`
    )
  }

  const rpcEndpoint = getRpcEndpoint()

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000))

    try {
      const response = await fetch(rpcEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-rpc-key": INTERNAL_RPC_KEY || "",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getTransactionReceipt",
          params: [txHash],
        }),
      })
      const result = await response.json()

      if (result.result) {
        if (result.result.status === "0x1") {
          return { success: true, receipt: result.result }
        } else {
          return { success: false, error: "Transaction reverted on-chain" }
        }
      }
    } catch {
    }
  }
  return { success: false, error: "Transaction confirmation timed out" }
}


function encodeUint256(value: number | bigint): string {
  return BigInt(value).toString(16).padStart(64, "0")
}

function encodeAddress(value: string): string {
  return value.slice(2).toLowerCase().padStart(64, "0")
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


const SEL = {
  questCount:       "0x3970ab43",
  getQuest:         "0x49f86f34",
  getRemainingClaims: "0xfb77f89d",
  hasUserClaimed:   "0x07c7a72d",
  getUserNonce:     "0x6834e3a8",
  getCreatorQuests: "0x4f351884",
  protocolFeeBps:   "0x35659fb8",
  approve:          "0x095ea7b3",
  allowance:        "0xdd62ed3e",
  balanceOf:        "0x70a08231",
} as const


export async function getQuestCount(): Promise<number> {
  const result = await ethCall(CONTRACTS.QUEST_ROUTER, SEL.questCount)
  if (result === "0x" || result.length < 66) return 0
  return Number(BigInt(result))
}

export async function getQuest(questId: number): Promise<Quest | null> {
  if (isBrowserRuntime) {
    return browserGetJson<Quest | null>(`/api/quests/${questId}`)
  }

  const data = SEL.getQuest + encodeUint256(questId)
  const result = await ethCall(CONTRACTS.QUEST_ROUTER, data)
  if (result === "0x" || result.length < 66) return null
  const hex = result.slice(2)
  const tupleOffset = Number(decodeUint256(hex, 0))
  const t = tupleOffset * 2
  const id = Number(decodeUint256(hex, t + 0))
  const creator = decodeAddress(hex, t + 64)
  const stringOffsetBytes = Number(decodeUint256(hex, t + 128))
  const actionMask = Number(decodeUint256(hex, t + 192))
  const payoutPerClaimRaw = decodeUint256(hex, t + 256)
  const maxClaims = Number(decodeUint256(hex, t + 320))
  const claimCount = Number(decodeUint256(hex, t + 384))
  const deadline = Number(decodeUint256(hex, t + 448))
  const isActive = decodeBool(hex, t + 512)
  const minFollowers = Number(decodeUint256(hex, t + 576))
  const requirePowerBadge = decodeBool(hex, t + 640)
  const stringPos = t + stringOffsetBytes * 2
  const strLen = Number(decodeUint256(hex, stringPos))
  const strHex = hex.slice(stringPos + 64, stringPos + 64 + strLen * 2)
  let targetIdentifier = ""
  for (let i = 0; i < strHex.length; i += 2) {
    targetIdentifier += String.fromCharCode(parseInt(strHex.slice(i, i + 2), 16))
  }

  return {
    id,
    creator,
    targetIdentifier,
    actionMask,
    payoutPerClaim: Number(payoutPerClaimRaw) / 1e6,
    maxClaims,
    claimCount,
    deadline,
    isActive,
    minFollowers,
    requirePowerBadge
  }
}

export async function getAllQuests(): Promise<Quest[]> {
  if (isBrowserRuntime) {
    return browserGetJson<Quest[]>("/api/quests")
  }

  try {
    const count = await getQuestCount()
    if (count === 0) return []
    const quests = await Promise.all(
      Array.from({ length: count }, (_, i) => getQuest(i))
    )
    return quests.filter((q): q is Quest => q !== null)
  } catch (error) {
    console.error("Failed to get quests:", error)
    return []
  }
}

export async function getQuestVaultBalance(questId: number): Promise<number> {
  if (isBrowserRuntime) {
    const result = await browserGetJson<{ balance: number }>(
      `/api/quests/vault-balance?questId=${questId}`
    )
    return result.balance
  }

  try {
    const data = encodeFunctionData({
      abi: QUEST_VAULT_ABI,
      functionName: "getQuestBalance",
      args: [BigInt(questId)]
    })
    const result = await ethCall(CONTRACTS.QUEST_VAULT, data)
    if (result === "0x" || result.length < 66) return 0
    return Number(BigInt(result)) / 1e6
  } catch (error) {
    console.error(`Failed to get vault balance for quest ${questId}:`, error)
    return 0
  }
}

export async function getRemainingClaims(questId: number): Promise<number> {
  const data = SEL.getRemainingClaims + encodeUint256(questId)
  const result = await ethCall(CONTRACTS.QUEST_ROUTER, data)
  if (result === "0x") return 0
  return Number(BigInt(result))
}

export async function hasUserClaimed(questId: number, user: string): Promise<boolean> {
  if (isBrowserRuntime) {
    const result = await browserGetJson<{ claimed: boolean }>(
      `/api/quests/claimed?questId=${questId}&user=${encodeURIComponent(user)}`
    )
    return result.claimed
  }

  const data = SEL.hasUserClaimed + encodeUint256(questId) + encodeAddress(user)
  const result = await ethCall(CONTRACTS.QUEST_ROUTER, data)
  return result !== "0x" && decodeBool(result.slice(2), 0)
}

export async function getUserNonce(user: string): Promise<number> {
  const data = SEL.getUserNonce + encodeAddress(user)
  const result = await ethCall(CONTRACTS.QUEST_ROUTER, data)
  if (result === "0x") return 0
  return Number(BigInt(result))
}

export async function getProtocolFeeBps(): Promise<number> {
  const result = await ethCall(CONTRACTS.QUEST_ROUTER, SEL.protocolFeeBps)
  if (result === "0x") return 0
  return Number(BigInt(result))
}


export async function checkAllowance(owner: string): Promise<number> {
  if (isBrowserRuntime) {
    const result = await browserGetJson<{ allowance: number }>(
      `/api/allowance?owner=${encodeURIComponent(owner)}`
    )
    return result.allowance
  }

  try {
    const data = SEL.allowance + encodeAddress(owner) + encodeAddress(CONTRACTS.QUEST_VAULT)
    const result = await ethCall(CONTRACTS.USDC, data)
    if (result === "0x") return 0
    return Number(BigInt(result)) / 1e6
  } catch {
    return 0
  }
}

export async function getUSDCBalance(address: string): Promise<number> {
  if (isBrowserRuntime) {
    const result = await browserGetJson<{ balance: number }>(
      `/api/usdc-balance?address=${encodeURIComponent(address)}`
    )
    return result.balance
  }

  try {
    const data = SEL.balanceOf + encodeAddress(address)
    const result = await ethCall(CONTRACTS.USDC, data)
    if (result === "0x") return 0
    return Number(BigInt(result)) / 1e6
  } catch {
    return 0
  }
}


export function buildApproveUSDCTx(amount: number): { to: string; data: string } {
  const amountWei = BigInt(Math.floor(amount * 1e6))
  const data = SEL.approve + encodeAddress(CONTRACTS.QUEST_VAULT) + encodeUint256(amountWei)
  return { to: CONTRACTS.USDC, data }
}

export function buildCreateQuestTx(
  targetIdentifier: string,
  actionType: number,
  payoutPerClaim: number,
  maxClaims: number,
  deadline: number,
  minFollowers: number,
  requirePowerBadge: boolean
): { to: string; data: string } {
  const payoutWei = BigInt(Math.floor(payoutPerClaim * 1e6))
  return {
    to: CONTRACTS.QUEST_ROUTER,
    data: encodeFunctionData({
      abi: QUEST_ROUTER_ABI,
      functionName: "createQuest",
      args: [
        targetIdentifier,
        actionType,
        payoutWei,
        BigInt(maxClaims),
        BigInt(deadline),
        minFollowers,
        requirePowerBadge
      ]
    })
  }
}

export function buildClaimRewardTx(questId: number, sigDeadline: number, signature: string): { to: string; data: string } {
  return {
    to: CONTRACTS.QUEST_ROUTER,
    data: encodeFunctionData({
      abi: QUEST_ROUTER_ABI,
      functionName: "claimReward",
      args: [BigInt(questId), BigInt(sigDeadline), signature as `0x${string}`]
    })
  }
}

export function buildRefundQuestTx(questId: number): { to: string; data: string } {
  return {
    to: CONTRACTS.QUEST_ROUTER,
    data: encodeFunctionData({
      abi: QUEST_ROUTER_ABI,
      functionName: "refundQuest",
      args: [BigInt(questId)]
    })
  }
}

export function buildDeactivateQuestTx(questId: number): { to: string; data: string } {
  return {
    to: CONTRACTS.QUEST_ROUTER,
    data: encodeFunctionData({
      abi: QUEST_ROUTER_ABI,
      functionName: "deactivateQuest",
      args: [BigInt(questId)]
    })
  }
}
