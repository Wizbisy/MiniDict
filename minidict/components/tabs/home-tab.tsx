"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, TrendingUp, RefreshCw, Sparkles } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MarketCard } from "@/components/market-card"
import type { EngagementMarket } from "@/lib/types"

type FilterType = "active" | "resolved" | "all"
type SortType = "pool" | "ending" | "newest"

export function HomeTab() {
  const [markets, setMarkets] = useState<EngagementMarket[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filter, setFilter] = useState<FilterType>("active")
  const [sortBy, setSortBy] = useState<SortType>("pool")

  const loadMarkets = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      fetch("/api/cron/resolve").catch(() => {})

      const res = await fetch("/api/markets")
      const data = await res.json()
      setMarkets(data || [])
    } catch (error) {
      console.error("Failed to fetch markets:", error)
      setMarkets([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadMarkets()

    const interval = setInterval(() => loadMarkets(true), 30000)
    return () => clearInterval(interval)
  }, [loadMarkets])

  const now = Date.now() / 1000
  const filteredAndSortedMarkets = markets
    .filter((market) => {
      if (filter === "active" && (market.resolved || market.deadline < now)) return false
      if (filter === "resolved" && !market.resolved) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          market.castText?.toLowerCase().includes(query) ||
          market.castAuthor?.toLowerCase().includes(query)
        )
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === "pool") {
        return (b.totalYesAmount + b.totalNoAmount) - (a.totalYesAmount + a.totalNoAmount)
      }
      if (sortBy === "ending") {
        return a.deadline - b.deadline
      }
      if (sortBy === "newest") {
        return b.id - a.id
      }
      return 0
    })

  return (
    <div className="px-3 py-4 max-w-3xl mx-auto">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 bg-secondary/50 border-border/50 rounded-xl text-sm"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 mb-3">
        {(["active", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              filter === f
                ? "bg-primary/20 text-primary"
                : "bg-secondary/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <h2 className="font-semibold text-foreground text-sm truncate">Predictions</h2>
          <span className="text-xs text-muted-foreground">({filteredAndSortedMarkets.length})</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortType)}>
            <SelectTrigger className="w-[110px] h-8 text-xs bg-secondary/50 border-border/50 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pool">Biggest Pool</SelectItem>
              <SelectItem value="ending">Ending Soon</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg"
            onClick={() => loadMarkets(true)}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Markets List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-48 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredAndSortedMarkets.length === 0 ? (
        <div className="text-center py-16">
          <Sparkles className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground font-medium">No predictions found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {filter === "active" ? "No active markets right now" : "Try a different filter or search"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredAndSortedMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  )
}
