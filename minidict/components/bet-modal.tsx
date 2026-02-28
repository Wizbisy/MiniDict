"use client"

import { useState, useEffect } from "react"
import { X, AlertCircle, Wallet, Loader2, CheckCircle2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMiniApp } from "./providers/miniapp-provider"
import { useModal } from "./providers/modal-provider"
import { computeOdds, formatUSDC, formatMetricType } from "@/lib/types"
import { buildApproveUSDCTx, buildPlaceBetTx, checkAllowance } from "@/lib/contracts"
import type { EngagementMarket } from "@/lib/types"

interface BetModalProps {
  market: EngagementMarket
  prediction: boolean
  onClose: () => void
}

type Step = "input" | "approving" | "betting" | "success" | "error"

export function BetModal({ market, prediction, onClose }: BetModalProps) {
  const { isConnected, balance, connect, address, sendTransaction } = useMiniApp()
  const { setModalOpen } = useModal()
  const [amount, setAmount] = useState("")
  const [step, setStep] = useState<Step>("input")
  const [errorMsg, setErrorMsg] = useState("")
  const [txHash, setTxHash] = useState("")

  useEffect(() => {
    setModalOpen(true)
    return () => setModalOpen(false)
  }, [setModalOpen])

  const amountNum = Number.parseFloat(amount) || 0
  const { yesPrice, noPrice } = computeOdds(market.totalYesAmount, market.totalNoAmount)
  const selectedPrice = prediction ? yesPrice : noPrice
  const potentialPayout = selectedPrice > 0 ? amountNum / selectedPrice : 0
  const potentialProfit = potentialPayout - amountNum
  const minBet = 1

  const handleSubmit = async () => {
    if (amountNum < minBet) {
      setErrorMsg(`Minimum bet is $${minBet}`)
      setStep("error")
      return
    }

    if (amountNum > balance.usdc) {
      setErrorMsg("Insufficient USDC balance")
      setStep("error")
      return
    }

    if (!address) return

    try {
      const currentAllowance = await checkAllowance(address)
      if (currentAllowance < amountNum) {
        setStep("approving")
        const approveTx = buildApproveUSDCTx(amountNum)
        const approveResult = await sendTransaction(approveTx.to, approveTx.data, "0x0")
        if (!approveResult.success) {
          setErrorMsg(approveResult.error || "USDC approval failed")
          setStep("error")
          return
        }
        await new Promise((r) => setTimeout(r, 3000))
      }

      setStep("betting")
      const betTx = buildPlaceBetTx(market.id, prediction, amountNum)
      const betResult = await sendTransaction(betTx.to, betTx.data, "0x0")

      if (betResult.success) {
        setTxHash(betResult.txHash || "")
        setStep("success")
      } else {
        setErrorMsg(betResult.error || "Bet placement failed")
        setStep("error")
      }
    } catch (error) {
      console.error("Bet error:", error)
      setErrorMsg(error instanceof Error ? error.message : "Transaction failed")
      setStep("error")
    }
  }

  if (step === "success") {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm">
        <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-in slide-in-from-bottom duration-300">
          <div className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Bet Placed!</h2>
            <p className="text-muted-foreground mb-2">
              Your ${amountNum} bet on <span className={prediction ? "text-primary font-semibold" : "text-destructive font-semibold"}>
                {prediction ? "YES" : "NO"}
              </span> was successfully placed.
            </p>
            {txHash && (
              <a
                href={`https://basescan.org/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                View on Basescan →
              </a>
            )}
            <Button onClick={onClose} className="w-full mt-6">
              Done
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">Place Bet</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Market Info */}
        <div className="bg-secondary rounded-lg p-4 mb-6">
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
            {market.castText || `Cast ${market.castHash.slice(0, 10)}...`}
          </p>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {market.targetValue}+ {formatMetricType(market.metricType).toLowerCase()}
            </span>
            <span className={`font-bold text-sm ${prediction ? "text-primary" : "text-destructive"}`}>
              {prediction ? "YES" : "NO"} @ {(selectedPrice * 100).toFixed(0)}¢
            </span>
          </div>
        </div>

        {!isConnected ? (
          <div className="text-center py-6">
            <Wallet className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Connect your wallet to place a bet</p>
            <Button
              onClick={connect}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02]"
              size="lg"
            >
              Connect Wallet
            </Button>
          </div>
        ) : step === "approving" || step === "betting" ? (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
            <p className="font-medium text-foreground mb-1">
              {step === "approving" ? "Approving USDC..." : "Placing bet..."}
            </p>
            <p className="text-sm text-muted-foreground">
              {step === "approving"
                ? "Confirm the approval in your wallet"
                : "Confirm the transaction in your wallet"}
            </p>
            <div className="flex items-center justify-center gap-2 mt-4 text-xs text-muted-foreground">
              <span className={step === "approving" ? "text-primary font-medium" : ""}>Approve</span>
              <ArrowRight className="h-3 w-3" />
              <span className={step === "betting" ? "text-primary font-medium" : ""}>Bet</span>
            </div>
          </div>
        ) : (
          <>
            {/* Amount Input */}
            <div className="mb-6">
              <label className="text-sm text-muted-foreground mb-2 block">Amount (USDC)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => {
                    setAmount(e.target.value)
                    setStep("input")
                    setErrorMsg("")
                  }}
                  placeholder="0.00"
                  className="pl-7 text-lg"
                  min={minBet}
                  step="0.01"
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Min: ${minBet}</span>
                <span>Balance: {formatUSDC(balance.usdc)}</span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2 mt-3">
                {[5, 10, 25, 50].map((val) => (
                  <button
                    key={val}
                    onClick={() => { setAmount(val.toString()); setStep("input"); setErrorMsg("") }}
                    className="flex-1 py-2 text-sm bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-foreground"
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            {/* Payout Info */}
            {amountNum > 0 && step === "input" && (
              <div className="bg-secondary rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Potential Payout</span>
                  <span className="font-semibold text-foreground">{formatUSDC(potentialPayout)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Potential Profit</span>
                  <span className="font-semibold text-primary">+{formatUSDC(potentialProfit)}</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {step === "error" && errorMsg && (
              <div className="flex items-start gap-2 text-destructive mb-4 text-sm bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={amountNum < minBet || amountNum > balance.usdc}
              className="w-full"
              size="lg"
            >
              {`Bet ${formatUSDC(amountNum)} on ${prediction ? "YES" : "NO"}`}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
