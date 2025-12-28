"use client"

import { useState } from "react"
import { X, AlertCircle, Wallet, Loader2, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useMiniApp } from "./providers/miniapp-provider"
import { formatPercentage } from "@/lib/polymarket"
import type { Market } from "@/lib/types"

interface BetModalProps {
  market: Market
  outcome: {
    name: string
    price: number
    index: number
  }
  onClose: () => void
}

export function BetModal({ market, outcome, onClose }: BetModalProps) {
  const { isConnected, balance, connect, address } = useMiniApp()
  const [amount, setAmount] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [orderResult, setOrderResult] = useState<{
    success: boolean
    orderId?: string
    error?: string
    code?: string
  } | null>(null)

  const amountNum = Number.parseFloat(amount) || 0
  const potentialPayout = amountNum / outcome.price
  const potentialProfit = potentialPayout - amountNum
  const minBet = 2

  const handleSubmit = async () => {
    if (amountNum < minBet) {
      setOrderResult({ success: false, error: `Minimum bet is $${minBet}` })
      return
    }

    if (amountNum > balance.usdc) {
      setOrderResult({ success: false, error: "Insufficient USDC balance" })
      return
    }

    setIsSubmitting(true)
    setOrderResult(null)

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order: {
            tokenId: market.clobTokenIds?.[outcome.index] || market.id,
            price: outcome.price,
            size: amountNum,
            side: "BUY",
            funderAddress: address,
          },
          userAddress: address,
          userTimestamp: Date.now(),
        }),
      })

      const data = await response.json()

      if (data.success) {
        setOrderResult({
          success: true,
          orderId: data.orderId,
        })
      } else {
        setOrderResult({
          success: false,
          error: data.error,
          code: data.code,
        })
      }
    } catch (error) {
      console.error("Order error:", error)
      setOrderResult({ success: false, error: "Failed to place order. Please try again." })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (orderResult?.success) {
    return (
      <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 backdrop-blur-sm">
        <div className="w-full max-w-lg bg-card border-t border-border rounded-t-2xl p-6 animate-in slide-in-from-bottom duration-300">
          <div className="text-center py-8">
            <CheckCircle2 className="h-16 w-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Order Placed</h2>
            <p className="text-muted-foreground mb-2">
              Your bet of ${amountNum} on "{outcome.name}" was successfully placed.
            </p>
            <p className="text-xs text-muted-foreground font-mono mb-6">Order ID: {orderResult.orderId}</p>
            <Button onClick={onClose} className="w-full">
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
          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{market.question}</p>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground">{outcome.name}</span>
            <span className="font-bold text-primary">{formatPercentage(outcome.price)}</span>
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
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7 text-lg"
                  min={minBet}
                  step="0.01"
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                <span>Min: ${minBet}</span>
                <span>Balance: ${balance.usdc.toFixed(2)} USDC</span>
              </div>

              {/* Quick Amount Buttons */}
              <div className="flex gap-2 mt-3">
                {[10, 25, 50, 100].map((val) => (
                  <button
                    key={val}
                    onClick={() => setAmount(val.toString())}
                    className="flex-1 py-2 text-sm bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-foreground"
                  >
                    ${val}
                  </button>
                ))}
              </div>
            </div>

            {/* Payout Info */}
            {amountNum > 0 && (
              <div className="bg-secondary rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Potential Payout</span>
                  <span className="font-semibold text-foreground">${potentialPayout.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Potential Profit</span>
                  <span className="font-semibold text-primary">+${potentialProfit.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Error Display */}
            {orderResult?.error && (
              <div className="flex items-start gap-2 text-destructive mb-4 text-sm bg-destructive/10 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span>{orderResult.error}</span>
                  {orderResult.code === "MISSING_CREDENTIALS" && (
                    <p className="text-xs mt-1 opacity-80">
                      Required: POLY_BUILDER_API_KEY, POLY_BUILDER_SECRET, POLY_BUILDER_PASSPHRASE
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Warning */}
            {amountNum > 0 && amountNum < minBet && !orderResult?.error && (
              <div className="flex items-center gap-2 text-amber-500 mb-4 text-sm">
                <AlertCircle className="h-4 w-4" />
                <span>Minimum bet is ${minBet}</span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmit}
              disabled={amountNum < minBet || amountNum > balance.usdc || isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Placing Order...
                </>
              ) : (
                `Bet $${amountNum || 0} on ${outcome.name}`
              )}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
