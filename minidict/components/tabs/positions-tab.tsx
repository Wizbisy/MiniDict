"use client"

import { useState, useEffect } from "react"
import { Loader2, CheckCircle, DollarSign } from "lucide-react"
import { Card } from "@/components/ui/card"
import { useMiniApp } from "../providers/miniapp-provider"
import { getAllQuests, hasUserClaimed } from "@/lib/contracts"
import { formatUSDC, ACTION_TYPE_LABELS } from "@/lib/types"
import { CastPreview } from "../cast-preview"
import type { Quest, ActionType } from "@/lib/types"

function isCastAction(type: ActionType): boolean {
  return type === "like" || type === "recast" || type === "custom"
}

export function BetsTab() {
  const [claimedQuests, setClaimedQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const { address } = useMiniApp()

  useEffect(() => {
    async function fetchClaims() {
      if (!address) {
        setLoading(false)
        return
      }

      try {
        const allQuests = await getAllQuests()
        const claimed: Quest[] = []

        await Promise.all(
          allQuests.map(async (q) => {
            const didClaim = await hasUserClaimed(q.id, address)
            if (didClaim) claimed.push(q)
          })
        )

        claimed.sort((a, b) => b.id - a.id)
        setClaimedQuests(claimed)
      } catch (error) {
        console.error("Failed to load claims:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchClaims()
  }, [address])

  if (!address) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Connect your wallet to see your claims</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      <div>
        <h2 className="text-xl font-bold">My Claims</h2>
        <p className="text-sm text-muted-foreground">
          Quests you&apos;ve completed and rewards earned
        </p>
      </div>

      {claimedQuests.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No claims yet</p>
          <p className="text-sm text-muted-foreground mt-1">Complete a quest to earn USDC!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {claimedQuests.map((quest) => (
            <Card key={quest.id} className="p-4 rounded-xl border-border/50">
              {/* Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {ACTION_TYPE_LABELS[quest.actionType]} Quest #{quest.id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-500">
                    +{formatUSDC(quest.payoutPerClaim)}
                  </p>
                  <p className="text-xs text-muted-foreground">Claimed</p>
                </div>
              </div>

              {/* Embedded cast preview for cast-based quests */}
              {isCastAction(quest.actionType) && (
                <CastPreview castHash={quest.targetIdentifier} />
              )}

              {/* Target for follow quests */}
              {quest.actionType === "follow" && (
                <div className="bg-secondary/40 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">Followed:</p>
                  <p className="text-sm font-medium font-mono">{quest.targetIdentifier}</p>
                </div>
              )}
            </Card>
          ))}

          {/* Total earned */}
          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <p className="text-sm text-muted-foreground">Total Earned</p>
            <p className="text-2xl font-bold text-primary">
              {formatUSDC(claimedQuests.reduce((sum, q) => sum + q.payoutPerClaim, 0))}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
