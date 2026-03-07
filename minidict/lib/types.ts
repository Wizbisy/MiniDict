export type ActionType = "like" | "recast" | "follow" | "mint_nft" | "custom"
export const ACTION_TYPES: ActionType[] = ["like", "recast", "follow", "mint_nft", "custom"]
export const QUEST_ACTION_TYPES: ActionType[] = ["like", "recast", "follow", "custom"]
export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  like: "Like",
  recast: "Recast",
  follow: "Follow",
  mint_nft: "Mint",
  custom: "Reply",
}

export interface Quest {
  id: number
  creator: string
  targetIdentifier: string
  actionType: ActionType
  payoutPerClaim: number    
  maxClaims: number
  claimCount: number
  deadline: number          
  isActive: boolean
  vaultBalance?: number
}

export type TabType = "home" | "quests" | "profile"


export function actionTypeFromIndex(index: number): ActionType {
  return ACTION_TYPES[index] ?? "custom"
}

export function actionTypeToIndex(type: ActionType): number {
  const i = ACTION_TYPES.indexOf(type)
  return i >= 0 ? i : 4 
}

export function formatUSDC(amount: number): string {
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatDeadline(timestamp: number): string {
  const now = Date.now() / 1000
  const remaining = timestamp - now

  if (remaining <= 0) return "Ended"

  const hours = Math.floor(remaining / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    return `${days}d ${hours % 24}h left`
  }
  if (hours > 0) return `${hours}h ${minutes}m left`
  return `${minutes}m left`
}

export function getRemainingClaimsText(quest: Quest): string {
  const remaining = quest.maxClaims - quest.claimCount
  return `${remaining} / ${quest.maxClaims} claims left`
}


export interface CastDetails {
  hash: string
  author: {
    fid: number
    username: string
    displayName: string
    pfpUrl: string
  }
  text: string
  timestamp: string
  engagement: {
    likes: number
    recasts: number
    replies: number
  }
}
