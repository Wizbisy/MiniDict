"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, TrendingUp, TrendingDown, AlertCircle, Gift, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useMiniApp } from "@/components/providers/miniapp-provider"
import { getUserBets, getAllMarkets, buildClaimWinningsTx } from "@/lib/contracts"
import { computeOdds, formatUSDC, formatMetricType, formatDeadline } from "@/lib/types"
import type { EngagementMarket, UserBet } from "@/lib/types"

interface EnrichedBet extends UserBet {
  market: EngagementMarket | null
}

export function BetsTab() {
  const { address, isConnected, connect, sendTransaction } = useMiniApp()
  const [bets, setBets] = useState<EnrichedBet[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [claimingId, setClaimingId] = useState<number | null>(null)

  const fetchBets = useCallback(async () => {
    if (!address) return

    setIsLoading(true)
    try {
      const [userBets, allMarkets] = await Promise.all([
        getUserBets(address),
        getAllMarkets(),
      ])

      const marketsMap = new Map(allMarkets.map((m) => [m.id, m]))

      const enriched: EnrichedBet[] = userBets.map((bet) => ({
        ...bet,
        market: marketsMap.get(bet.marketId) || null,
      }))

      setBets(enriched)
    } catch (error) {
      console.error("Failed to fetch bets:", error)
      setBets([])
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (isConnected && address) {
      fetchBets()

      const interval = setInterval(fetchBets, 30000)
      return () => clearInterval(interval)
    }
  }, [isConnected, address, fetchBets])

  const handleClaim = async (marketId: number) => {
    setClaimingId(marketId)
    try {
      const tx = buildClaimWinningsTx(marketId)
      const result = await sendTransaction(tx.to, tx.data, "0x0")
      if (result.success) {
        fetchBets() 
      } else {
        alert(result.error || "Claim failed")
      }
    } catch (error) {
      console.error("Claim error:", error)
      alert("Failed to claim winnings")
    } finally {
      setClaimingId(null)
    }
  }

  if (!isConnected) {
    return (
      <div className="px-4 py-8 max-w-3xl mx-auto">
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">View Your Bets</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Connect your wallet to view and manage your bets.
          </p>
          <Button
            onClick={connect}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02]"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    )
  }

  const activeBets = bets.filter((b) => b.market && !b.market.resolved)
  const claimableBets = bets.filter(
    (b) => b.market?.resolved && !b.claimed && b.market.outcome === b.prediction
  )
  const resolvedBets = bets.filter((b) => b.market?.resolved)

  const marketGroups = new Map<number, EnrichedBet[]>()
  for (const b of bets) {
    const existing = marketGroups.get(b.marketId) || []
    existing.push(b)
    marketGroups.set(b.marketId, existing)
  }

  let totalWagered = 0
  let totalReturns = 0
  let wins = 0
  let losses = 0
  const sparklinePoints: number[] = [0]

  marketGroups.forEach((marketBets) => {
    const market = marketBets[0]?.market
    if (!market) return

    const spent = marketBets.reduce((s, b) => s + b.amount, 0)
    totalWagered += spent

    if (!market.resolved) return  

    let payout = 0
    const pool = market.totalYesAmount + market.totalNoAmount
    for (const b of marketBets) {
      if (market.outcome === b.prediction) {
        wins++
        const side = b.prediction ? market.totalYesAmount : market.totalNoAmount
        if (side > 0) payout += (b.amount * pool) / side * 0.98
      } else {
        losses++
      }
    }

    totalReturns += payout
    sparklinePoints.push(sparklinePoints[sparklinePoints.length - 1] + (payout - spent))
  })

  const netPnL = totalReturns - totalWagered
  const activeValue = activeBets.reduce((sum, b) => sum + b.amount, 0)

  const sparklineSvg = (() => {
    if (sparklinePoints.length < 2) return null
    const w = 80, h = 32
    const min = Math.min(...sparklinePoints)
    const max = Math.max(...sparklinePoints)
    const range = max - min || 1
    const pts = sparklinePoints.map((v, i) => ({
      x: (i / (sparklinePoints.length - 1)) * w,
      y: h - ((v - min) / range) * (h - 4) - 2,
    }))
    let line = `M ${pts[0].x} ${pts[0].y}`
    for (let i = 1; i < pts.length; i++) {
      const cp = (pts[i].x - pts[i - 1].x) * 0.4
      line += ` C ${pts[i - 1].x + cp} ${pts[i - 1].y}, ${pts[i].x - cp} ${pts[i].y}, ${pts[i].x} ${pts[i].y}`
    }
    const area = `${line} L ${pts[pts.length - 1].x} ${h} L ${pts[0].x} ${h} Z`
    const color = netPnL >= 0 ? "#22c55e" : "#ef4444"
    return { line, area, w, h, color }
  })()

  return (
    <div className="px-3 py-3 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">My Bets</h1>
          <p className="text-xs text-muted-foreground">
            {activeBets.length} active · {claimableBets.length} claimable
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchBets} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* PnL Summary */}
      {bets.length > 0 && !isLoading && (
        <div className="relative isolate mb-4">
          {/* Subtle multi-color glow layer (light mode only) */}
          <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-blue-400/40 via-purple-400/40 to-transparent blur-xl dark:hidden" />
          
          <Card className="p-4 bg-zinc-900/70 dark:bg-zinc-800/50 backdrop-blur-md border-zinc-800 dark:border-zinc-700/50 shadow-inner">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-zinc-400">Net PnL</span>
            <div className="flex items-center gap-3">
              {/* Mini sparkline */}
              {sparklineSvg && (
                <svg width={sparklineSvg.w} height={sparklineSvg.h} className="opacity-70">
                  <defs>
                    <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={sparklineSvg.color} stopOpacity="0.3" />
                      <stop offset="100%" stopColor={sparklineSvg.color} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={sparklineSvg.area} fill="url(#sparkGrad)" />
                  <path d={sparklineSvg.line} fill="none" stroke={sparklineSvg.color} strokeWidth={1.5} strokeLinecap="round" />
                </svg>
              )}
              <div className={`flex items-center gap-1.5 text-lg font-bold ${
                netPnL >= 0 ? "text-green-500" : "text-red-500"
              }`}>
                {netPnL >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                <span>{netPnL >= 0 ? "+" : ""}{formatUSDC(netPnL)}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Wagered</p>
              <p className="text-sm font-semibold text-white">{formatUSDC(totalWagered)}</p>
            </div>
            <div>
              <p className="text-[10px] text-green-500/70 uppercase tracking-wider">Returns</p>
              <p className="text-sm font-semibold text-green-500">{formatUSDC(totalReturns)}</p>
            </div>
            <div>
              <p className="text-[10px] text-zinc-400 uppercase tracking-wider">Record</p>
              <p className="text-sm font-semibold text-white">{wins}W - {losses}L</p>
            </div>
          </div>
          {activeValue > 0 && (
            <p className="text-xs text-zinc-400 mt-2 pt-2 border-t border-zinc-700/50">
              {formatUSDC(activeValue)} in active bets
            </p>
          )}
        </Card>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-3" />
              <div className="flex justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : bets.length === 0 ? (
        <div className="text-center py-12">
          <div className="h-12 w-12 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No bets yet</p>
          <p className="text-xs text-muted-foreground mt-1">Place your first bet on a prediction</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Claimable Section */}
          {claimableBets.length > 0 && (
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-primary uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Gift className="h-3.5 w-3.5" />
                Claim Winnings
              </h3>
              {claimableBets.map((bet) => (
                <BetCard
                  key={`${bet.marketId}-${bet.prediction}`}
                  bet={bet}
                  onClaim={() => handleClaim(bet.marketId)}
                  claiming={claimingId === bet.marketId}
                />
              ))}
            </div>
          )}

          {/* Active Bets */}
          {activeBets.length > 0 && (
            <div className="mb-2">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Active
              </h3>
              {activeBets.map((bet) => (
                <BetCard key={`${bet.marketId}-${bet.prediction}`} bet={bet} />
              ))}
            </div>
          )}

          {/* Resolved Bets */}
          {resolvedBets.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Resolved
              </h3>
              {resolvedBets.map((bet) => (
                <BetCard key={`${bet.marketId}-${bet.prediction}`} bet={bet} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function BetCard({
  bet,
  onClaim,
  claiming,
}: {
  bet: EnrichedBet
  onClaim?: () => void
  claiming?: boolean
}) {
  if (!bet.market) return null

  const { yesPrice } = computeOdds(bet.market.totalYesAmount, bet.market.totalNoAmount)
  const won = bet.market.resolved && bet.market.outcome === bet.prediction
  const lost = bet.market.resolved && bet.market.outcome !== bet.prediction

  const totalPool = bet.market.totalYesAmount + bet.market.totalNoAmount
  let estimatedPayout = 0
  if (bet.prediction && bet.market.totalYesAmount > 0) {
    estimatedPayout = (bet.amount * totalPool) / bet.market.totalYesAmount
  } else if (!bet.prediction && bet.market.totalNoAmount > 0) {
    estimatedPayout = (bet.amount * totalPool) / bet.market.totalNoAmount
  }
  const estimatedProfit = estimatedPayout - bet.amount

  return (
    <Card className="p-4 mb-2 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0 pr-2">
          <p className="text-sm font-medium text-foreground line-clamp-2">
            {bet.market.castText || `Cast ${bet.market.castHash.slice(0, 10)}...`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge
              variant="outline"
              className="text-xs border-border dark:border-zinc-700 text-muted-foreground dark:text-zinc-400 bg-transparent font-medium"
            >
              {bet.prediction ? "YES" : "NO"}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {bet.market.targetValue}+ {formatMetricType(bet.market.metricType).toLowerCase()}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-muted-foreground">Bet: {formatUSDC(bet.amount)}</p>
          {bet.market.resolved ? (
            won ? (
              <div className="flex items-center gap-1 text-sm font-semibold text-green-500">
                <TrendingUp className="h-3 w-3" />
                <span>+{formatUSDC(estimatedPayout * 0.98)}</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm font-semibold text-red-500">
                <TrendingDown className="h-3 w-3" />
                <span>-{formatUSDC(bet.amount)}</span>
              </div>
            )
          ) : (
            <div>
              <p className="text-sm font-semibold text-foreground">{formatUSDC(estimatedPayout)}</p>
              <p className="text-xs text-muted-foreground">{formatDeadline(bet.market.deadline)}</p>
            </div>
          )}
        </div>
      </div>

      {onClaim && !bet.claimed && (
        <Button
          size="sm"
          className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500"
          onClick={onClaim}
          disabled={claiming}
        >
          {claiming ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Claiming...
            </>
          ) : (
            <>
              <Gift className="h-4 w-4 mr-2" />
              Claim Winnings
            </>
          )}
        </Button>
      )}
    </Card>
  )
}

export { BetsTab as PositionsTab }
