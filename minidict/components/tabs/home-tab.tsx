"use client"

import { useState, useEffect, useMemo } from "react"
import { Loader2, RefreshCw, Plus, SlidersHorizontal } from "lucide-react"
import { QuestCard } from "../quest-card"
import { CreateQuestModal } from "../create-quest-modal"
import { getAllQuests, hasUserClaimed } from "@/lib/contracts"
import { useMiniApp } from "../providers/miniapp-provider"
import { ACTION_TYPE_LABELS, decodeActionMask } from "@/lib/types"
import type { Quest, ActionType } from "@/lib/types"

type SortOption = "newest" | "reward" | "ending"
type FilterOption = "all" | ActionType

export function HomeTab() {
  const [quests, setQuests] = useState<Quest[]>([])
  const [claimedMap, setClaimedMap] = useState<Record<number, boolean>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [filterBy, setFilterBy] = useState<FilterOption>("all")
  const [filterPowerBadge, setFilterPowerBadge] = useState(false)
  const [filterFollowerReq, setFilterFollowerReq] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const { address } = useMiniApp()

  const fetchQuests = async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true)
      else setLoading(true)

      const allQuests = await getAllQuests()
      setQuests(allQuests)

      if (address) {
        const claimed: Record<number, boolean> = {}
        await Promise.all(
          allQuests.map(async (q) => {
            claimed[q.id] = await hasUserClaimed(q.id, address)
          })
        )
        setClaimedMap(claimed)
      }
    } catch (error) {
      console.error("Failed to load quests:", error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchQuests()
  }, [address])

  const displayQuests = useMemo(() => {
    let filtered = [...quests].filter(q => q.isActive)

    if (filterBy !== "all") {
      filtered = filtered.filter((q) => {
        const actions = decodeActionMask(q.actionMask)
        return actions.includes(filterBy as ActionType)
      })
    }

    if (filterPowerBadge) {
      filtered = filtered.filter((q) => q.requirePowerBadge)
    }

    if (filterFollowerReq) {
      filtered = filtered.filter((q) => q.minFollowers > 0)
    }

    filtered.sort((a, b) => {
      const aClaimed = claimedMap[a.id] ?? false
      const bClaimed = claimedMap[b.id] ?? false
      if (aClaimed !== bClaimed) return aClaimed ? 1 : -1

      switch (sortBy) {
        case "reward":
          return b.payoutPerClaim - a.payoutPerClaim
        case "ending":
          return a.deadline - b.deadline
        case "newest":
        default:
          return b.id - a.id
      }
    })

    return filtered
  }, [quests, sortBy, filterBy, claimedMap, filterPowerBadge, filterFollowerReq])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Active Quests</h2>
          <p className="text-sm text-muted-foreground">
            Complete actions to earn USDC rewards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Create
          </button>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2 rounded-lg transition-colors ${showFilters ? "bg-primary/10 text-primary" : "hover:bg-secondary"}`}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </button>
          <button
            onClick={() => fetchQuests(true)}
            disabled={refreshing}
            className="p-2 rounded-lg hover:bg-secondary transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Sort & Filter Bar */}
      {showFilters && (
        <div className="space-y-2 bg-secondary/30 rounded-xl p-3 animate-in slide-in-from-top-2 duration-200">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10">Sort</span>
            <div className="flex gap-1.5 flex-1">
              {([
                ["newest", "Newest"],
                ["reward", "Top Reward"],
                ["ending", "Ending Soon"],
              ] as [SortOption, string][]).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setSortBy(value)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    sortBy === value
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {/* Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-10">Type</span>
            <div className="flex gap-1.5 flex-1 flex-wrap">
              <button
                onClick={() => setFilterBy("all")}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  filterBy === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                All
              </button>
              {(["like", "recast", "follow", "custom"] as ActionType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterBy(type)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    filterBy === type
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {ACTION_TYPE_LABELS[type]}
                </button>
              ))}
            </div>
          </div>

          {/* Requirements Filter */}
          <div className="flex items-center gap-2 pt-2 mt-1 border-t border-border/30">
            <span className="text-xs text-muted-foreground w-10">Reqs</span>
            <div className="flex gap-1.5 flex-1 flex-wrap">
              <button
                onClick={() => setFilterPowerBadge(!filterPowerBadge)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  filterPowerBadge
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                Farcaster Pro
              </button>
              <button
                onClick={() => setFilterFollowerReq(!filterFollowerReq)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  filterFollowerReq
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                }`}
              >
                Follower Count
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quest List */}
      {displayQuests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {filterBy !== "all" ? "No quests match this filter" : "No quests available yet"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {filterBy !== "all" ? "Try a different filter" : "Create the first quest!"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayQuests.map((quest) => (
            <QuestCard
              key={quest.id}
              quest={quest}
              userAddress={address ?? undefined}
              hasClaimed={claimedMap[quest.id] ?? false}
              onClaimed={() => fetchQuests(true)}
            />
          ))}
        </div>
      )}

      {/* Create Quest Modal */}
      {showCreateModal && (
        <CreateQuestModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => fetchQuests(true)}
        />
      )}
    </div>
  )
}
