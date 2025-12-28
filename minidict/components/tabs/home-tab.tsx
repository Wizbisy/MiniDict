"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, TrendingUp, RefreshCw } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MarketCard } from "@/components/market-card"
import { fetchMarkets } from "@/lib/polymarket"
import type { Market } from "@/lib/types"

export function HomeTab() {
  const [markets, setMarkets] = useState<Market[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [sortBy, setSortBy] = useState<"volume" | "recent" | "ending">("volume")

  const loadMarkets = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    try {
      const data = await fetchMarkets({
        limit: 500,
        closed: false,
        active: true,
        order: "volume24hr",
        ascending: false,
      })

      setMarkets(data)
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
  }, [loadMarkets])

  const filteredAndSortedMarkets = markets
    .filter((market) => {
      if (market.endDate) {
        const endTime = new Date(market.endDate).getTime()
        const now = Date.now()
        if (endTime < now) return false
      }

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          market.question?.toLowerCase().includes(query) || market.description?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }
      return true
    })
    .sort((a, b) => {
      if (sortBy === "volume") {
        const getVolume = (m: Market) => {
          const vol24 = m.volume24hr
          const volTotal = m.volume
          if (vol24 !== null && vol24 !== undefined) {
            return typeof vol24 === "number" ? vol24 : Number.parseFloat(String(vol24)) || 0
          }
          if (volTotal !== null && volTotal !== undefined) {
            return typeof volTotal === "number" ? volTotal : Number.parseFloat(String(volTotal)) || 0
          }
          return 0
        }
        return getVolume(b) - getVolume(a)
      } else if (sortBy === "recent") {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return dateB - dateA
      } else if (sortBy === "ending") {
        const now = Date.now()
        const dateA = a.endDate ? new Date(a.endDate).getTime() : Number.MAX_SAFE_INTEGER
        const dateB = b.endDate ? new Date(b.endDate).getTime() : Number.MAX_SAFE_INTEGER
        return dateA - dateB
      }
      return 0
    })

  return (
    <div className="px-3 py-4 max-w-lg mx-auto">
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search markets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 h-10 bg-secondary/50 border-border/50 rounded-xl text-sm"
        />
      </div>

      <div className="flex items-center justify-between mb-3 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <TrendingUp className="h-4 w-4 text-primary flex-shrink-0" />
          <h2 className="font-semibold text-foreground text-sm truncate">Markets</h2>
          <span className="text-xs text-muted-foreground">({filteredAndSortedMarkets.length})</span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Select value={sortBy} onValueChange={(value) => setSortBy(value as typeof sortBy)}>
            <SelectTrigger className="w-[110px] h-8 text-xs bg-secondary/50 border-border/50 rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="volume">Trending</SelectItem>
              <SelectItem value="recent">Most Recent</SelectItem>
              <SelectItem value="ending">Ending Soon</SelectItem>
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
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-36 bg-card rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filteredAndSortedMarkets.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No markets found</p>
          <p className="text-sm mt-2">Try a different search</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAndSortedMarkets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  )
}
