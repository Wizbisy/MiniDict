
export type MetricType = "likes" | "recasts" | "replies" | "followers"

export interface EngagementMarket {
  id: number
  castHash: string
  castAuthor: string
  castAuthorPfp: string
  castText: string
  metricType: MetricType
  targetValue: number
  currentValue: number
  deadline: number 
  totalYesAmount: number 
  totalNoAmount: number 
  resolved: boolean
  outcome: boolean | null 
  creator: string 
}

export interface UserBet {
  marketId: number
  prediction: boolean 
  amount: number 
  claimed: boolean
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

export type TabType = "home" | "bets" | "profile"

export function computeOdds(totalYes: number, totalNo: number): { yesPrice: number; noPrice: number } {
  const total = totalYes + totalNo
  if (total === 0) return { yesPrice: 0.5, noPrice: 0.5 }
  return {
    yesPrice: totalYes / total,
    noPrice: totalNo / total,
  }
}

export function formatMetricType(type: MetricType): string {
  switch (type) {
    case "likes":
      return "Likes"
    case "recasts":
      return "Recasts"
    case "replies":
      return "Replies"
    case "followers":
      return "Followers"
  }
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
