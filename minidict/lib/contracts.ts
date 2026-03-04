import { CONTRACTS, QUEST_ROUTER_ABI, ERC20_ABI, BASE_RPC } from "./contract-abi"
import type { Quest } from "./types"
import { actionTypeFromIndex } from "./types"


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
  if (result.error) throw new Error(result.error.message || "eth_call failed")
  return result.result || "0x"
}


export async function waitForTxReceipt(txHash: string, maxAttempts = 30): Promise<{ success: boolean; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, 2000))

    try {
      const response = await fetch(BASE_RPC, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          return { success: true }
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
  try {
    const data = SEL.getQuest + encodeUint256(questId)
    const result = await ethCall(CONTRACTS.QUEST_ROUTER, data)
    if (result === "0x" || result.length < 66) return null
    const hex = result.slice(2)
    const tupleOffset = Number(decodeUint256(hex, 0))
    const t = tupleOffset * 2
    const id = Number(decodeUint256(hex, t + 0))
    const creator = decodeAddress(hex, t + 64)
    const stringOffsetBytes = Number(decodeUint256(hex, t + 128))
    const actionType = Number(decodeUint256(hex, t + 192))
    const payoutPerClaimRaw = decodeUint256(hex, t + 256)
    const maxClaims = Number(decodeUint256(hex, t + 320))
    const claimCount = Number(decodeUint256(hex, t + 384))
    const deadline = Number(decodeUint256(hex, t + 448))
    const isActive = decodeBool(hex, t + 512)
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
      actionType: actionTypeFromIndex(actionType),
      payoutPerClaim: Number(payoutPerClaimRaw) / 1e6,
      maxClaims,
      claimCount,
      deadline,
      isActive,
    }
  } catch (error) {
    console.error(`Failed to get quest ${questId}:`, error)
    return null
  }
}

export async function getAllQuests(): Promise<Quest[]> {
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

export async function getRemainingClaims(questId: number): Promise<number> {
  const data = SEL.getRemainingClaims + encodeUint256(questId)
  const result = await ethCall(CONTRACTS.QUEST_ROUTER, data)
  if (result === "0x") return 0
  return Number(BigInt(result))
}

export async function hasUserClaimed(questId: number, user: string): Promise<boolean> {
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
  deadline: number
): { to: string; data: string } {
  const payoutWei = BigInt(Math.floor(payoutPerClaim * 1e6))
  const sel = "0x7304b78e"  
  const offsetToString = encodeUint256(160) 
  const actionTypeEnc = encodeUint256(actionType)
  const payoutEnc = encodeUint256(payoutWei)
  const maxClaimsEnc = encodeUint256(maxClaims)
  const deadlineEnc = encodeUint256(deadline)
  const strBytes = new TextEncoder().encode(targetIdentifier)
  const strLen = encodeUint256(strBytes.length)
  let strHex = ""
  for (const b of strBytes) {
    strHex += b.toString(16).padStart(2, "0")
  }
  const strPadded = strHex.padEnd(Math.ceil(strHex.length / 64) * 64, "0")
  const data = sel + offsetToString + actionTypeEnc + payoutEnc + maxClaimsEnc + deadlineEnc + strLen + strPadded
  return { to: CONTRACTS.QUEST_ROUTER, data }
}

export function buildClaimRewardTx(questId: number, signature: string): { to: string; data: string } {
  const sigClean = signature.startsWith("0x") ? signature.slice(2) : signature
  const offsetToSig = "0000000000000000000000000000000000000000000000000000000000000040" 
  const sigLen = encodeUint256(sigClean.length / 2)
  const sigPadded = sigClean.padEnd(Math.ceil(sigClean.length / 64) * 64, "0")
  const sel = "0x754685c5" 
  const data = sel + encodeUint256(questId) + offsetToSig + sigLen + sigPadded
  return { to: CONTRACTS.QUEST_ROUTER, data }
}
