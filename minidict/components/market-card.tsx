"use client"

import { useState, useEffect } from "react"
import { Heart, Repeat2, MessageCircle, Users, Clock, DollarSign, TrendingUp } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { computeOdds, formatMetricType, formatUSDC, formatDeadline } from "@/lib/types"
import { BetModal } from "./bet-modal"
import type { EngagementMarket } from "@/lib/types"

interface MarketCardProps {
  market: EngagementMarket
}

const metricIcons = {
  likes: Heart,
  recasts: Repeat2,
  replies: MessageCircle,
  followers: Users,
}

const metricColors = {
  likes: "text-rose-400",
  recasts: "text-emerald-400",
  replies: "text-blue-400",
  followers: "text-purple-400",
}

export function MarketCard({ market }: MarketCardProps) {
  const [selectedPrediction, setSelectedPrediction] = useState<boolean | null>(null)
  const [timeLeft, setTimeLeft] = useState(formatDeadline(market.deadline))

  const { yesPrice, noPrice } = computeOdds(market.totalYesAmount, market.totalNoAmount)
  const MetricIcon = metricIcons[market.metricType]
  const totalPool = market.totalYesAmount + market.totalNoAmount
  const progress = market.targetValue > 0 ? Math.min((market.currentValue / market.targetValue) * 100, 100) : 0
  const isExpired = Date.now() / 1000 >= market.deadline

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatDeadline(market.deadline))
    }, 60000)
    return () => clearInterval(interval)
  }, [market.deadline])

  return (
    <>
      <Card className="p-4 hover:bg-card/80 transition-all duration-200 rounded-xl border-border/50">
        {/* Cast Preview */}
        <div className="flex gap-3 mb-3">
          {market.castAuthorPfp ? (
            <img
              src={market.castAuthorPfp}
              alt=""
              className="h-9 w-9 rounded-full object-cover flex-shrink-0 ring-1 ring-white/10"
            />
          ) : (
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-sm font-medium text-foreground">
                {market.castAuthor || "unknown"}
              </span>
              <div className={cn("flex items-center gap-0.5", metricColors[market.metricType])}>
                <MetricIcon className="h-3 w-3" />
                <span className="text-xs font-medium">
                  {market.targetValue}+ {formatMetricType(market.metricType)}
                </span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-snug">
              {market.castText || `Cast ${market.castHash.slice(0, 10)}...`}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-muted-foreground mb-1">
            <span>
              {market.currentValue} / {market.targetValue} {formatMetricType(market.metricType).toLowerCase()}
            </span>
            <span>{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress >= 100 ? "bg-primary" : "bg-gradient-to-r from-blue-500 to-indigo-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 mb-3 text-xs text-slate-500 dark:text-muted-foreground">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span>{formatUSDC(totalPool)} pool</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{timeLeft}</span>
          </div>
          {market.resolved && (
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span className={market.outcome ? "text-primary" : "text-destructive"}>
                {market.outcome ? "Target Met ✓" : "Target Missed ✗"}
              </span>
            </div>
          )}
        </div>

        {/* YES / NO Buttons */}
        {!market.resolved && !isExpired ? (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedPrediction(true)}
              className="flex items-center justify-between p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span className="font-semibold text-sm text-primary">YES</span>
              <span className="font-bold text-sm tabular-nums text-primary">
                {(yesPrice * 100).toFixed(0)}¢
              </span>
            </button>
            <button
              onClick={() => setSelectedPrediction(false)}
              className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 hover:bg-destructive/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span className="font-semibold text-sm text-destructive">NO</span>
              <span className="font-bold text-sm tabular-nums text-destructive">
                {(noPrice * 100).toFixed(0)}¢
              </span>
            </button>
          </div>
        ) : (
          <div className={cn(
            "text-center py-2 rounded-lg text-sm font-medium",
            market.resolved
              ? market.outcome
                ? "bg-primary/10 text-primary"
                : "bg-red-500/10 text-red-600 dark:text-red-500"
              : "bg-secondary text-slate-500 dark:text-muted-foreground"
          )}>
            {market.resolved
              ? market.outcome
                ? "✓ Target was met — YES wins"
                : "✗ Target was not met — NO wins"
              : "Market expired — awaiting resolution"}
          </div>
        )}
      </Card>

      {/* Bet Modal */}
      {selectedPrediction !== null && (
        <BetModal
          market={market}
          prediction={selectedPrediction}
          onClose={() => setSelectedPrediction(null)}
        />
      )}
    </>
  )
}
