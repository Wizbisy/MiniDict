"use client"

import { useState, useEffect, useCallback } from "react"
import { Loader2, CheckCircle, Trophy } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { useMiniApp } from "../providers/miniapp-provider"
import { getAllQuests, hasUserClaimed, buildRefundQuestTx, waitForTxReceipt, getQuestVaultBalance } from "@/lib/contracts"
import { formatUSDC, ACTION_TYPE_LABELS, formatDeadline, decodeActionMask } from "@/lib/types"
import { CastPreview } from "../cast-preview"
import type { Quest, ActionType } from "@/lib/types"

function isCastAction(type: ActionType): boolean {
  return type === "like" || type === "recast" || type === "custom"
}

export function BetsTab() {
  const [claimedQuests, setClaimedQuests] = useState<Quest[]>([])
  const [creatorQuests, setCreatorQuests] = useState<Quest[]>([])
  const [isRefunding, setIsRefunding] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const { address, sendTransaction } = useMiniApp()
  const { toast } = useToast()

  const fetchClaims = useCallback(async () => {
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

      const myQuests = allQuests.filter(q => q.creator.toLowerCase() === address.toLowerCase())
      
      const myQuestsWithBalance = await Promise.all(
        myQuests.map(async (q) => {
          const bal = await getQuestVaultBalance(q.id)
          return { ...q, vaultBalance: bal }
        })
      )
      
      setCreatorQuests(myQuestsWithBalance)

      claimed.sort((a, b) => b.id - a.id)
      setClaimedQuests(claimed)
    } catch (error) {
      console.error("Failed to load claims:", error)
    } finally {
      setLoading(false)
    }
  }, [address])

  useEffect(() => {
    fetchClaims()
  }, [fetchClaims])

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

  const handleRefund = async (quest: Quest) => {
    if (isRefunding) return
    setIsRefunding(quest.id)
    try {
      const tx = buildRefundQuestTx(quest.id)
      const submitResult = await sendTransaction(tx.to, tx.data, "0x0")
      if (!submitResult.success || !submitResult.txHash) throw new Error(submitResult.error || "Transaction rejected")
      
      const receipt = await waitForTxReceipt(submitResult.txHash)
      if (!receipt.success) throw new Error(receipt.error)
      
      toast({
        title: "Refund Successful",
        description: "Your unspent USDC has been returned to your Base wallet.",
      })
      
      await fetchClaims()
    } catch (e: any) {
      window.alert("Refund failed: " + (e.message || "Unknown error"))
    } finally {
      setIsRefunding(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">
      {/* My Deployed Quests */}
      {creatorQuests.length > 0 && (
        <div className="bg-secondary/60 dark:bg-zinc-800/60 rounded-xl p-4 border border-border dark:border-zinc-700/30 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-purple-500" />
            <h2 className="text-xl font-bold">My Deployed Quests</h2>
          </div>
          <div className="space-y-3">
            {creatorQuests.map((q) => {
              const now = Date.now() / 1000
              const isExpired = q.deadline <= now
              const isFullyClaimed = q.claimCount >= q.maxClaims
              const remaining = q.maxClaims - q.claimCount
              const canRefund = (isExpired || !q.isActive) && (q.vaultBalance ?? 0) > 0

              return (
                <div key={q.id} className="bg-background/50 dark:bg-zinc-900/50 p-3 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground dark:text-white">
                      Action: {decodeActionMask(q.actionMask).map(a => ACTION_TYPE_LABELS[a]).join(", ")}
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-zinc-500 mt-1">
                      {q.claimCount} / {q.maxClaims} claims
                    </p>
                    <p className="text-xs text-muted-foreground dark:text-zinc-500">
                      {isExpired ? "Expired" : "Active"}
                    </p>
                  </div>
                  {canRefund && (
                    <Button 
                      onClick={() => handleRefund(q)}
                      disabled={isRefunding === q.id}
                      size="sm" 
                      variant="outline"
                      className="text-xs border-purple-500/30 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                    >
                      {isRefunding === q.id ? "Refunding..." : "Refund USDC"}
                    </Button>
                  )}
                  {isFullyClaimed && !canRefund && (
                    <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-md">Fully Claimed</span>
                  )}
                  {!isExpired && !isFullyClaimed && q.isActive && (
                    <span className="text-xs text-blue-500 bg-blue-500/10 px-2 py-1 rounded-md">{formatDeadline(q.deadline)}</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

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
                      {decodeActionMask(quest.actionMask).map(a => ACTION_TYPE_LABELS[a]).join(", ")} Quest #{quest.id}
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
              {decodeActionMask(quest.actionMask).some(isCastAction) && (
                <CastPreview castHash={quest.targetIdentifier} />
              )}

              {/* Target for follow quests */}
              {decodeActionMask(quest.actionMask).includes("follow") && (
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
