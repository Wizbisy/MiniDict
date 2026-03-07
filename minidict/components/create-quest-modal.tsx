"use client"

import { useState } from "react"
import { X, Loader2, CheckCircle2, AlertCircle, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useModal } from "./providers/modal-provider"
import { useMiniApp } from "./providers/miniapp-provider"
import { buildApproveUSDCTx, buildCreateQuestTx, checkAllowance, getProtocolFeeBps, waitForTxReceipt, getQuestCount } from "@/lib/contracts"
import { QUEST_ACTION_TYPES, ACTION_TYPE_LABELS, actionTypeToIndex, formatUSDC } from "@/lib/types"
import type { ActionType } from "@/lib/types"

interface CreateQuestModalProps {
  onClose: () => void
  onCreated?: () => void
}

type Step = "form" | "approving" | "creating" | "success" | "error"

export function CreateQuestModal({ onClose, onCreated }: CreateQuestModalProps) {
  const [step, setStep] = useState<Step>("form")
  const [error, setError] = useState("")
  const { setModalOpen } = useModal()
  const { sendTransaction, address } = useMiniApp()

  const [targetIdentifier, setTargetIdentifier] = useState("")
  const [actionType, setActionType] = useState<ActionType>("like")
  const [payoutPerClaim, setPayoutPerClaim] = useState("")
  const [maxClaims, setMaxClaims] = useState("")
  const [durationHours, setDurationHours] = useState("24")

  const payout = parseFloat(payoutPerClaim) || 0
  const claims = parseInt(maxClaims) || 0
  const totalCost = payout * claims

  const handleCreate = async () => {
    try {
      if (!targetIdentifier || payout <= 0 || claims <= 0) {
        setError("Please fill in all fields")
        setStep("error")
        return
      }

      if (payout < 0.01) {
        setError("Minimum payout is $0.01")
        setStep("error")
        return
      }

      setStep("approving")
      const currentAllowance = await checkAllowance(address!)

      if (currentAllowance < totalCost) {
        const approveTx = buildApproveUSDCTx(totalCost * 1.1)
        const approveResult = await sendTransaction(approveTx.to, approveTx.data, "0x0")

        if (!approveResult.success || !approveResult.txHash) {
          throw new Error(approveResult.error || "USDC approval was rejected")
        }

        const approveReceipt = await waitForTxReceipt(approveResult.txHash)
        if (!approveReceipt.success) {
          throw new Error(approveReceipt.error || "USDC approval failed on-chain")
        }
      }

      setStep("creating")
      const deadline = Math.floor(Date.now() / 1000) + parseInt(durationHours) * 3600
      const createTx = buildCreateQuestTx(
        targetIdentifier,
        actionTypeToIndex(actionType),
        payout,
        claims,
        deadline
      )
      const createResult = await sendTransaction(createTx.to, createTx.data, "0x0")

      if (!createResult.success || !createResult.txHash) {
        throw new Error(createResult.error || "Quest creation was rejected")
      }

      const createReceipt = await waitForTxReceipt(createResult.txHash)
      if (!createReceipt.success) {
        throw new Error(createReceipt.error || "Quest creation failed on-chain")
      }

      setStep("success")

      try {
        const questCount = await getQuestCount()
        fetch("/api/notify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            questId: questCount,
            actionType: ACTION_TYPE_LABELS[actionType],
            payout: payout
          })
        }).catch(err => console.error("Notify API Error:", err))
      } catch (e) {
        console.error("Failed to push notification", e)
      }

      onCreated?.()
    } catch (err: any) {
      setError(err.message || "Failed to create quest")
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
      <div className="relative w-full max-w-md bg-background rounded-t-2xl sm:rounded-2xl border border-border p-6 animate-in slide-in-from-bottom duration-300 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Create Quest</h3>
          <button onClick={handleClose} className="p-1 rounded-lg hover:bg-secondary transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Step */}
        {step === "form" && (
          <div className="space-y-4">
            {/* Action Type */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Action Type</label>
              <div className="grid grid-cols-4 gap-2">
                {QUEST_ACTION_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setActionType(type)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      actionType === type
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary/50 text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {ACTION_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            {/* Target */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                Target {actionType === "follow" ? "(FID or username)" : "(Cast hash or URL)"}
              </label>
              <Input
                value={targetIdentifier}
                onChange={(e) => setTargetIdentifier(e.target.value)}
                placeholder={actionType === "follow" ? "e.g. vitalik.eth" : "e.g. 0xabcd1234..."}
                className="bg-secondary/50"
              />
            </div>

            {/* Payout */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Payout per Claim ($)</label>
                <Input
                  type="number"
                  value={payoutPerClaim}
                  onChange={(e) => setPayoutPerClaim(e.target.value)}
                  placeholder="1.00"
                  min="0.01"
                  step="0.01"
                  className="bg-secondary/50"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Max Claims</label>
                <Input
                  type="number"
                  value={maxClaims}
                  onChange={(e) => setMaxClaims(e.target.value)}
                  placeholder="100"
                  min="1"
                  className="bg-secondary/50"
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Duration (hours)</label>
              <Input
                type="number"
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                placeholder="24"
                min="1"
                className="bg-secondary/50"
              />
            </div>

            {/* Cost Summary */}
            {totalCost > 0 && (
              <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Per claim</span>
                  <span>{formatUSDC(payout)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">× {claims} claims</span>
                  <span className="font-bold text-primary">{formatUSDC(totalCost)}</span>
                </div>
              </div>
            )}

            <Button className="w-full" size="lg" onClick={handleCreate} disabled={totalCost <= 0}>
              <Plus className="h-4 w-4 mr-2" />
              Create Quest — {formatUSDC(totalCost)}
            </Button>
          </div>
        )}

        {/* Loading Steps */}
        {(step === "approving" || step === "creating") && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">
              {step === "approving" ? "Approving USDC..." : "Creating quest on-chain..."}
            </p>
          </div>
        )}

        {/* Success */}
        {step === "success" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <CheckCircle2 className="h-12 w-12 text-emerald-500" />
            <p className="text-lg font-bold">Quest Created!</p>
            <p className="text-sm text-muted-foreground text-center">
              Your quest is now live. Users can start claiming rewards.
            </p>
            <Button className="mt-2" onClick={handleClose}>Done</Button>
          </div>
        )}

        {/* Error */}
        {step === "error" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-lg font-bold">Failed</p>
            <p className="text-sm text-muted-foreground text-center">{error}</p>
            <div className="flex gap-2 mt-2">
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={() => { setStep("form"); setError("") }}>Try Again</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
