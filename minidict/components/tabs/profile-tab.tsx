"use client"

import type React from "react"
import { useState } from "react"
import {
  History,
  HelpCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  Copy,
  Check,
  Wallet,
  TrendingUp,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMiniApp } from "@/components/providers/miniapp-provider"
import Image from "next/image"

interface Trade {
  id: string
  market: string
  outcome: string
  side: "buy" | "sell"
  amount: number
  price: number
  timestamp: string
}

export function ProfileTab() {
  const {
    address,
    isConnected,
    balance,
    portfolio,
    connect,
    disconnect,
    farcasterUser,
    isFarcasterContext,
    basename,
    basenameAvatar,
    refreshBalances,
    refreshPortfolio,
  } = useMiniApp()

  const [comingSoonOpen, setComingSoonOpen] = useState(false)
  const [comingSoonFeature, setComingSoonFeature] = useState("")
  const [historyOpen, setHistoryOpen] = useState(false)
  const [trades, setTrades] = useState<Trade[]>([])
  const [tradesLoading, setTradesLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refreshBalances(), refreshPortfolio()])
    setIsRefreshing(false)
  }

  const getDisplayName = () => {
    if (basename) return basename
    if (isFarcasterContext && farcasterUser) {
      return farcasterUser.displayName || farcasterUser.username || truncateAddress(address!)
    }
    return truncateAddress(address!)
  }

  const handleComingSoon = (feature: string) => {
    setComingSoonFeature(feature)
    setComingSoonOpen(true)
  }

  const handleBaseScan = () => {
    if (address) {
      window.open(`https://basescan.org/address/${address}`, "_blank")
    }
  }

  const handleTradingHistory = async () => {
    setHistoryOpen(true)
    setTradesLoading(true)
    try {
      const res = await fetch(`/api/trades?address=${address}`)
      const data = await res.json()
      setTrades(data.trades || [])
    } catch (error) {
      console.error("Failed to fetch trades:", error)
      setTrades([])
    } finally {
      setTradesLoading(false)
    }
  }

  // Function to get the best available profile picture
  const getProfilePicture = () => {
    console.log(
      "[v0] Getting profile picture - basenameAvatar:",
      basenameAvatar,
      "farcasterPfp:",
      farcasterUser?.pfpUrl,
    )
    // Priority: basename avatar > farcaster pfp > null
    if (basenameAvatar) return basenameAvatar
    if (farcasterUser?.pfpUrl) return farcasterUser.pfpUrl
    return null
  }

  const profilePicture = getProfilePicture()

  if (!isConnected) {
    return (
      <div className="px-4 py-8 max-w-lg mx-auto">
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-zinc-800 mx-auto mb-4 flex items-center justify-center">
            <Wallet className="h-8 w-8 text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold text-white mb-2">Connect Your Wallet</h2>
          <p className="text-zinc-400 mb-6 text-sm">Connect to view your portfolio</p>
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
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 rounded-2xl p-5 border border-zinc-700/50">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            {profilePicture ? (
              <img
                src={profilePicture || "/placeholder.svg"}
                alt=""
                className="h-14 w-14 rounded-full object-cover ring-2 ring-zinc-700"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-2 ring-zinc-700">
                <span className="text-lg font-bold text-white">{address?.slice(2, 4).toUpperCase()}</span>
              </div>
            )}
            <div>
              <p className="font-semibold text-white text-lg">{getDisplayName()}</p>
              {isFarcasterContext && farcasterUser?.username && (
                <p className="text-sm text-blue-400">@{farcasterUser.username}</p>
              )}
              {basename && !isFarcasterContext && <p className="text-sm text-blue-400">{basename}</p>}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="text-zinc-400 hover:text-white hover:bg-zinc-700/50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Address Section */}
        <div className="bg-zinc-900/60 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-zinc-800 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-zinc-500">Wallet Address</p>
              <p className="font-mono text-sm text-zinc-300">{truncateAddress(address!)}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyAddress}
            className="h-8 w-8 text-zinc-400 hover:text-white hover:bg-zinc-700/50"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Balance Cards - Use actual logos */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Image src="/images/usdc-logo.png" alt="USDC" width={24} height={24} className="rounded-full" />
            <p className="text-xs text-zinc-500">USDC</p>
          </div>
          <p className="text-xl font-bold text-white">${balance.usdc.toFixed(2)}</p>
        </div>
        <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Image src="/images/base-eth-logo.png" alt="ETH" width={24} height={24} className="rounded-full" />
            <p className="text-xs text-zinc-500">ETH</p>
          </div>
          <p className="text-xl font-bold text-white">{balance.eth.toFixed(4)}</p>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="bg-zinc-800/60 rounded-xl p-4 border border-zinc-700/30">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-zinc-400" />
          <h3 className="font-semibold text-white text-sm">Portfolio Summary</h3>
        </div>
        {portfolio.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-5 w-full bg-zinc-700/50" />
            <Skeleton className="h-5 w-full bg-zinc-700/50" />
            <Skeleton className="h-5 w-full bg-zinc-700/50" />
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Total Value</span>
              <span className="font-semibold text-white">
                $
                {portfolio.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-zinc-400">Open Positions</span>
              <span className="font-semibold text-white">{portfolio.openPositionsCount}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-1.5">
                <TrendingUp className={`h-3.5 w-3.5 ${portfolio.pnl >= 0 ? "text-green-500" : "text-red-500"}`} />
                <span className="text-sm text-zinc-400">P&L</span>
              </div>
              <span className={`font-semibold ${portfolio.pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                {portfolio.pnl >= 0 ? "+" : ""}$
                {Math.abs(portfolio.pnl).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="space-y-2">
        <MenuButton icon={History} label="Trading History" onClick={handleTradingHistory} />
        <MenuButton icon={HelpCircle} label="Help & Support" onClick={() => handleComingSoon("Help & Support")} />
        <MenuButton icon={ExternalLink} label="View on Basescan" external onClick={handleBaseScan} />
        {!isFarcasterContext && <MenuButton icon={LogOut} label="Disconnect Wallet" onClick={disconnect} destructive />}
      </div>

      {/* Coming Soon Dialog */}
      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent className="max-w-xs bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-center text-white">{comingSoonFeature}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/20 mx-auto mb-3 flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-zinc-400 text-sm">This feature is coming soon. Stay tuned for updates!</p>
          </div>
          <Button onClick={() => setComingSoonOpen(false)} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white">
            Got it
          </Button>
        </DialogContent>
      </Dialog>

      {/* Trading History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-sm max-h-[80vh] overflow-y-auto bg-zinc-900 border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-white">Trading History</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            {tradesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-full bg-zinc-800" />
                <Skeleton className="h-16 w-full bg-zinc-800" />
                <Skeleton className="h-16 w-full bg-zinc-800" />
              </div>
            ) : trades.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-10 w-10 text-zinc-600 mx-auto mb-3" />
                <p className="text-zinc-500 text-sm">No trades yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {trades.map((trade) => (
                  <div key={trade.id} className="bg-zinc-800 rounded-lg p-3">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-medium text-white line-clamp-1">{trade.market}</span>
                      <span
                        className={`text-xs font-semibold ${trade.side === "buy" ? "text-green-500" : "text-red-500"}`}
                      >
                        {trade.side.toUpperCase()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-zinc-400">
                      <span>{trade.outcome}</span>
                      <span>
                        ${trade.amount.toFixed(2)} @ {(trade.price * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs text-zinc-500 mt-1">{new Date(trade.timestamp).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MenuButton({
  icon: Icon,
  label,
  external,
  onClick,
  destructive,
}: {
  icon: React.ElementType
  label: string
  external?: boolean
  onClick?: () => void
  destructive?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3.5 bg-zinc-800/60 rounded-xl hover:bg-zinc-700/60 transition-colors border border-zinc-700/30 ${
        destructive ? "text-red-500" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${destructive ? "text-red-500" : "text-zinc-400"}`} />
        <span className={`text-sm font-medium ${destructive ? "text-red-500" : "text-white"}`}>{label}</span>
      </div>
      {external && <ExternalLink className="h-4 w-4 text-zinc-500" />}
    </button>
  )
}
