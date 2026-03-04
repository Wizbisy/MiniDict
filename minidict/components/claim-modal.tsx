"use client"

import { useState } from "react"
import { X, Loader2, CheckCircle2, AlertCircle, Target, Heart, Repeat2, UserPlus, Sparkles, MessageCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useModal } from "./providers/modal-provider"
import { useMiniApp } from "./providers/miniapp-provider"
import { buildClaimRewardTx } from "@/lib/contracts"
import { createPublicClient, http } from "viem"
import { baseSepolia } from "viem/chains"
import type { Quest, ActionType } from "@/lib/types"
import { formatUSDC, ACTION_TYPE_LABELS } from "@/lib/types"
import { cn } from "@/lib/utils"

const actionIcons: Record<ActionType, typeof Heart> = {
  like: Heart,
  recast: Repeat2,
  follow: UserPlus,
  mint_nft: Sparkles,
  custom: MessageCircle,
}

const actionColors: Record<ActionType, string> = {
  like: "text-rose-400",
  recast: "text-emerald-400",
  follow: "text-blue-400",
  mint_nft: "text-purple-400",
  custom: "text-amber-400",
}

interface ClaimModalProps {
  quest: Quest
  userAddress: string
  onClose: () => void
}

type Step = "confirm" | "signing" | "submitting" | "success" | "error"

export function ClaimModal({ quest, userAddress, onClose }: ClaimModalProps) {
  const [step, setStep] = useState<Step>("confirm")
  const [error, setError] = useState<string>("")
  const { setModalOpen } = useModal()
  const { sendTransaction, farcasterUser } = useMiniApp()

  const handleClaim = async () => {
    try {
      setStep("signing")

      const response = await fetch("/api/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          questId: quest.id, 
          userAddress,
          fid: farcasterUser?.fid
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || "Failed to get claim signature")
      }

      const { signature } = await response.json()

      setStep("submitting")
      const tx = buildClaimRewardTx(quest.id, signature)
      const result = await sendTransaction(tx.to, tx.data, "0x0")

      if (!result.success || !result.txHash) {
        throw new Error(result.error || "Transaction was rejected")
      }

      const publicClient = createPublicClient({
        chain: baseSepolia,
        transport: http()
      })

      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: result.txHash as `0x${string}` 
      })
      
      if (receipt.status !== "success") {
        throw new Error("Claim failed on-chain")
      }

      setStep("success")
    } catch (err: any) {
      setError(err.message || "Claim failed")
      setStep("error")
    }
  }

  const handleClose = () => {
    setModalOpen(false)
    onClose()
  }

  useState(() => {
    setModalOpen(true)
  })

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl border border-border p-6 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Claim Reward</h3>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Confirm Step */}
        {step === "confirm" && (
          <div className="space-y-4">
            <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-xl bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                    {(() => {
                      const Icon = actionIcons[quest.actionType]
                      return <Icon className={cn("h-5 w-5", actionColors[quest.actionType])} />
                    })()}
                  </div>
                  <span className="text-muted-foreground">Action</span>
                </div>
                <span className="font-medium">{ACTION_TYPE_LABELS[quest.actionType]}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Target</span>
                <span className="font-mono text-xs">{quest.targetIdentifier.slice(0, 20)}...</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reward</span>
                <span className="font-bold text-primary">{formatUSDC(quest.payoutPerClaim)}</span>
              </div>
            </div>

            <div className="flex items-start gap-2 text-xs text-muted-foreground bg-amber-500/5 rounded-lg p-3">
              <AlertCircle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>Make sure you have completed the required action before claiming. Invalid claims will be rejected.</span>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleClaim}
            >
              Claim {formatUSDC(quest.payoutPerClaim)}
            </Button>
          </div>
        )}

        {/* Loading Steps */}
        {(step === "signing" || step === "submitting") && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {step === "signing" ? "Verifying your action..." : "Submitting transaction..."}
            </p>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="text-lg font-bold">Reward Claimed!</p>
            <p className="text-sm text-muted-foreground text-center">
              {formatUSDC(quest.payoutPerClaim)} USDC has been sent to your wallet.
            </p>
            <Button className="mt-2" onClick={handleClose}>
              Done
            </Button>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-lg font-bold">Claim Failed</p>
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => { setStep("confirm"); setError("") }}>Try Again</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
