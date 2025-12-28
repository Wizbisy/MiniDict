"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, TrendingUp, Clock, DollarSign } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { parseOutcomes, parseOutcomePrices, formatVolume, formatPercentage } from "@/lib/polymarket"
import { BetModal } from "./bet-modal"
import type { Market } from "@/lib/types"

interface MarketCardProps {
  market: Market
}

export function MarketCard({ market }: MarketCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [selectedOutcome, setSelectedOutcome] = useState<{
    name: string
    price: number
    index: number
  } | null>(null)

  const outcomes = parseOutcomes(market.outcomes)
  const prices = parseOutcomePrices(market.outcomePrices)

  const displayedOutcomes = expanded ? outcomes : outcomes.slice(0, 3)
  const hasMore = outcomes.length > 3

  const formatEndDate = (date: string | null) => {
    if (!date) return "No end date"
    const d = new Date(date)
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  const handleOutcomeClick = (name: string, price: number, index: number) => {
    setSelectedOutcome({ name, price, index })
  }

  return (
    <>
      <Card className="p-3 hover:bg-card/80 transition-colors rounded-xl border-border/50">
        {/* Header */}
        <div className="flex gap-2.5 mb-3">
          {market.image && (
            <img
              src={market.image || "/placeholder.svg"}
              alt=""
              className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground text-sm leading-snug line-clamp-2">{market.question}</h3>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span>{formatVolume(market.volumeNum)}</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            <span>{formatVolume(market.volume24hr)} 24h</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatEndDate(market.endDate)}</span>
          </div>
        </div>

        {/* Outcomes */}
        <div className="space-y-1.5">
          {displayedOutcomes.map((outcome, index) => {
            const price = prices[index] || 0
            const isYes = outcome.toLowerCase() === "yes"
            const isNo = outcome.toLowerCase() === "no"

            return (
              <button
                key={index}
                onClick={() => handleOutcomeClick(outcome, price, index)}
                className={cn(
                  "w-full flex items-center justify-between p-2.5 rounded-lg transition-all",
                  "hover:scale-[1.01] active:scale-[0.99]",
                  isYes && "bg-primary/10 hover:bg-primary/15",
                  isNo && "bg-destructive/10 hover:bg-destructive/15",
                  !isYes && !isNo && "bg-secondary/50 hover:bg-secondary/70",
                )}
              >
                <span className="font-medium text-sm text-foreground truncate pr-2">{outcome}</span>
                <span
                  className={cn(
                    "font-bold text-sm tabular-nums",
                    isYes && "text-primary",
                    isNo && "text-destructive",
                    !isYes && !isNo && "text-primary",
                  )}
                >
                  {formatPercentage(price)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Expand/Collapse Button */}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-muted-foreground h-8 text-xs"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <>
                <ChevronUp className="h-3.5 w-3.5 mr-1" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3.5 w-3.5 mr-1" />+{outcomes.length - 3} More
              </>
            )}
          </Button>
        )}
      </Card>

      {/* Bet Modal */}
      {selectedOutcome && (
        <BetModal market={market} outcome={selectedOutcome} onClose={() => setSelectedOutcome(null)} />
      )}
    </>
  )
}
