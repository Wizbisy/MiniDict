export interface Market {
  id: string
  question: string
  conditionId: string
  slug: string
  image: string | null
  icon: string | null
  description: string | null
  outcomes: string | null
  outcomePrices: string | null
  volume: string | null
  volumeNum: number | null
  liquidity: string | null
  liquidityNum: number | null
  active: boolean | null
  closed: boolean | null
  endDate: string | null
  createdAt: string | null
  category: string | null
  tags?: number[] | string[]
  enableOrderBook: boolean | null
  volume24hr: number | null
  volume1wk: number | null
  clobTokenIds?: string[]
}

export interface Tag {
  id: number
  label: string
  slug: string
}

export interface Event {
  id: string
  title: string
  slug: string
  description: string | null
  image: string | null
  icon: string | null
  active: boolean
  closed: boolean
  markets: Market[]
  volume: number | null
  liquidity: number | null
  endDate: string | null
}

export type TabType = "home" | "profile" | "positions"

export type MarketCategory =
  | "all"
  | "politics"
  | "sports"
  | "crypto"
  | "science"
  | "pop-culture"
  | "business"
  | "news"
  | "ai"

export interface BridgeTransaction {
  txHash: string
  sourceDomain: number
  destinationDomain: number
  amount: bigint
  sender: string
  recipient: string
  status: "pending" | "attesting" | "ready" | "complete" | "failed"
  attestation?: string
  message?: string
  nonce?: string
}

export interface CCTPAttestation {
  message: string
  attestation: string
  status: string
  nonce: string
  sourceDomain: number
  destinationDomain: number
}

export interface Position {
  id: string
  marketId: string
  conditionId: string
  title: string
  outcome: string
  outcomeIndex: number
  size: number
  avgPrice: number
  curPrice: number
  pnl: number
  pnlPercent: number
  value: number
}
