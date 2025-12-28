"use client"

import { useState, useEffect, useCallback } from "react"
import { RefreshCw, TrendingUp, TrendingDown, X, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { useMiniApp } from "@/components/providers/miniapp-provider"
import type { Position } from "@/lib/types"

export function PositionsTab() {
  const { address, isConnected, connect } = useMiniApp()
  const [positions, setPositions] = useState<Position[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null)
  const [isClosing, setIsClosing] = useState(false)

  const fetchPositions = useCallback(async () => {
    if (!address) return

    setIsLoading(true)
    try {
      const res = await fetch(`/api/positions?address=${address}`)
      const data = await res.json()
      setPositions(data.positions || [])
    } catch (error) {
      console.error("Failed to fetch positions:", error)
    } finally {
      setIsLoading(false)
    }
  }, [address])

  useEffect(() => {
    if (isConnected && address) {
      fetchPositions()
    }
  }, [isConnected, address, fetchPositions])

  const handleClosePosition = async () => {
    if (!selectedPosition) return

    setIsClosing(true)
    try {
      const res = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marketId: selectedPosition.marketId,
          conditionId: selectedPosition.conditionId,
          outcomeIndex: selectedPosition.outcomeIndex,
          side: "SELL",
          size: selectedPosition.size,
          price: selectedPosition.curPrice,
          userAddress: address,
        }),
      })

      const data = await res.json()
      if (data.success) {
        setSelectedPosition(null)
        fetchPositions()
      } else {
        alert(data.error || "Failed to close position")
      }
    } catch (error) {
      console.error("Failed to close position:", error)
      alert("Failed to close position")
    } finally {
      setIsClosing(false)
    }
  }

  if (!isConnected) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto">
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center">
            <TrendingUp className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground mb-2">View Your Positions</h2>
          <p className="text-muted-foreground mb-6 text-sm">
            Connect your wallet to view and manage your open positions.
          </p>
          <Button
            onClick={connect}
            size="lg"
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02]"
          >
            Connect Wallet
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-3 py-3 max-w-lg mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-foreground">Positions</h1>
          <p className="text-xs text-muted-foreground">{positions.length} open positions</p>
        </div>
        <Button variant="ghost" size="icon" onClick={fetchPositions} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-3 w-1/2 mb-3" />
              <div className="flex justify-between">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : positions.length === 0 ? (
        <div className="text-center py-12">
          <div className="h-12 w-12 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center">
            <AlertCircle className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground text-sm">No open positions</p>
          <p className="text-xs text-muted-foreground mt-1">Start trading to see your positions here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {positions.map((position) => (
            <Card
              key={position.id}
              className="p-4 cursor-pointer hover:bg-secondary/50 transition-colors"
              onClick={() => setSelectedPosition(position)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <p className="text-sm font-medium text-foreground line-clamp-2">{position.title}</p>
                  <Badge variant="outline" className="mt-1 text-xs">
                    {position.outcome}
                  </Badge>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold text-foreground">${position.value.toFixed(2)}</p>
                  <div
                    className={`flex items-center gap-1 text-xs ${position.pnl >= 0 ? "text-green-500" : "text-red-500"}`}
                  >
                    {position.pnl >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>
                      {position.pnl >= 0 ? "+" : ""}${position.pnl.toFixed(2)} ({position.pnlPercent.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Size: {position.size.toFixed(2)} shares</span>
                <span>
                  Avg: ${position.avgPrice.toFixed(2)} / Cur: ${position.curPrice.toFixed(2)}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Close Position Dialog */}
      <Dialog open={!!selectedPosition} onOpenChange={() => setSelectedPosition(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Position</DialogTitle>
            <DialogDescription className="line-clamp-2">{selectedPosition?.title}</DialogDescription>
          </DialogHeader>

          {selectedPosition && (
            <div className="space-y-4">
              <div className="bg-secondary rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Outcome</span>
                  <span className="font-medium">{selectedPosition.outcome}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shares</span>
                  <span className="font-medium">{selectedPosition.size.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Price</span>
                  <span className="font-medium">${selectedPosition.curPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Est. Value</span>
                  <span className="font-medium">${selectedPosition.value.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t border-border">
                  <span className="text-muted-foreground">P&L</span>
                  <span className={`font-semibold ${selectedPosition.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {selectedPosition.pnl >= 0 ? "+" : ""}${selectedPosition.pnl.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setSelectedPosition(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleClosePosition} disabled={isClosing} className="flex-1 gap-2">
              {isClosing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Closing...
                </>
              ) : (
                <>
                  <X className="h-4 w-4" />
                  Close Position
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
