"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  HelpCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  Copy,
  Check,
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMiniApp } from "@/components/providers/miniapp-provider"
import { getUserBets, getAllMarkets } from "@/lib/contracts"
import { formatUSDC } from "@/lib/types"
import type { UserBet, EngagementMarket } from "@/lib/types"
import { PnlChart } from "@/components/pnl-chart"
import Image from "next/image"

export function ProfileTab() {
  const {
    address,
    isConnected,
    balance,
    connect,
    disconnect,
    farcasterUser,
    isFarcasterContext,
    basename,
    basenameAvatar,
    refreshBalances,
  } = useMiniApp()

  const [comingSoonOpen, setComingSoonOpen] = useState(false)
  const [comingSoonFeature, setComingSoonFeature] = useState("")
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pnlData, setPnlData] = useState<{
    totalWagered: number
    totalReturns: number
    netPnL: number
    totalMarkets: number
    wins: number
    losses: number
    chartPoints: { label: string; value: number; cumulative: number }[]
  }>({ totalWagered: 0, totalReturns: 0, netPnL: 0, totalMarkets: 0, wins: 0, losses: 0, chartPoints: [] })

  const fetchPnL = useCallback(async () => {
    if (!address) return
    try {
      const [userBets, allMarkets] = await Promise.all([getUserBets(address), getAllMarkets()])
      const marketsMap = new Map(allMarkets.map((m) => [m.id, m]))

      const marketGroups = new Map<number, typeof userBets>()
      for (const b of userBets) {
        const existing = marketGroups.get(b.marketId) || []
        existing.push(b)
        marketGroups.set(b.marketId, existing)
      }

      const chartPoints: { label: string; value: number; cumulative: number }[] = []
      let cumPnL = 0
      let totalWagered = 0
      let totalReturns = 0
      let wins = 0
      let losses = 0

      chartPoints.push({ label: "Start", value: 0, cumulative: 0 })

      marketGroups.forEach((marketBets, marketId) => {
        const market = marketsMap.get(marketId)
        if (!market) return

        const spent = marketBets.reduce((s, b) => s + b.amount, 0)
        totalWagered += spent

        if (!market.resolved) return

        let payout = 0
        const pool = market.totalYesAmount + market.totalNoAmount
        for (const b of marketBets) {
          if (market.outcome === b.prediction) {
            wins++
            const side = b.prediction ? market.totalYesAmount : market.totalNoAmount
            if (side > 0) payout += (b.amount * pool) / side * 0.98
          } else {
            losses++
          }
        }

        totalReturns += payout
        const marketPnL = payout - spent

        cumPnL += marketPnL
        chartPoints.push({
          label: `#${marketId}`,
          value: marketPnL,
          cumulative: cumPnL,
        })
      })

      setPnlData({
        totalWagered,
        totalReturns,
        netPnL: totalReturns - totalWagered,
        totalMarkets: marketGroups.size,
        wins,
        losses,
        chartPoints,
      })
    } catch (error) {
      console.error("Failed to fetch PnL:", error)
    }
  }, [address])

  useEffect(() => {
    if (isConnected && address) fetchPnL()
  }, [isConnected, address, fetchPnL])

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
    await refreshBalances()
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
      window.open(`https://sepolia.basescan.org/address/${address}`, "_blank")
    }
  }

  const getProfilePicture = () => {
    if (basenameAvatar) return basenameAvatar
    if (farcasterUser?.pfpUrl) return farcasterUser.pfpUrl
    return null
  }

  const profilePicture = getProfilePicture()

  if (!isConnected) {
    return (
      <div className="px-4 py-8 max-w-3xl mx-auto">
        <div className="text-center py-16">
          <div className="h-16 w-16 rounded-full bg-secondary dark:bg-zinc-800 mx-auto mb-4 flex items-center justify-center">
            <Wallet className="h-8 w-8 text-muted-foreground dark:text-zinc-400" />
          </div>
          <h2 className="text-lg font-semibold text-foreground dark:text-white mb-2">Connect Your Wallet</h2>
          <p className="text-muted-foreground dark:text-zinc-400 mb-6 text-sm">Connect to view your profile</p>
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
    <div className="px-4 py-4 max-w-3xl mx-auto space-y-4">
      {/* Profile Card */}
      <div className="bg-gradient-to-br from-secondary/80 to-background/80 dark:from-zinc-800/80 dark:to-zinc-900/80 rounded-2xl p-5 border border-border dark:border-zinc-700/50">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt=""
                className="h-14 w-14 rounded-full object-cover ring-2 ring-border dark:ring-zinc-700"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-2 ring-border dark:ring-zinc-700">
                <span className="text-lg font-bold text-white">{address?.slice(2, 4).toUpperCase()}</span>
              </div>
            )}
            <div>
              <p className="font-semibold text-foreground dark:text-white text-lg">{getDisplayName()}</p>
              {isFarcasterContext && farcasterUser?.username && (
                <p className="text-sm text-blue-500 dark:text-blue-400">@{farcasterUser.username}</p>
              )}
              {basename && !isFarcasterContext && <p className="text-sm text-blue-500 dark:text-blue-400">{basename}</p>}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleRefresh}
            className="text-muted-foreground hover:text-foreground hover:bg-secondary/50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-700/50"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Address Section */}
        <div className="bg-background/60 dark:bg-zinc-900/60 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-secondary dark:bg-zinc-800 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-muted-foreground dark:text-zinc-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground dark:text-zinc-500">Wallet Address</p>
              <p className="font-mono text-sm text-foreground/80 dark:text-zinc-300">{truncateAddress(address!)}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={copyAddress}
            className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-secondary/50 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-zinc-700/50"
          >
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-secondary/60 dark:bg-zinc-800/60 rounded-xl p-4 border border-border dark:border-zinc-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Image src="/images/usdc-logo.png" alt="USDC" width={24} height={24} className="rounded-full" />
            <p className="text-xs text-muted-foreground dark:text-zinc-500">USDC</p>
          </div>
          <p className="text-xl font-bold text-foreground dark:text-white">${balance.usdc.toFixed(2)}</p>
        </div>
        <div className="bg-secondary/60 dark:bg-zinc-800/60 rounded-xl p-4 border border-border dark:border-zinc-700/30">
          <div className="flex items-center gap-2 mb-2">
            <Image src="/images/base-eth-logo.png" alt="ETH" width={24} height={24} className="rounded-full" />
            <p className="text-xs text-muted-foreground dark:text-zinc-500">ETH</p>
          </div>
          <p className="text-xl font-bold text-foreground dark:text-white">{balance.eth.toFixed(4)}</p>
        </div>
      </div>

      {/* Portfolio / PnL Section */}
      {pnlData.totalMarkets > 0 && (
        <div className="relative isolate">
          {/* Subtle multi-color glow layer (light mode only) */}
          <div className="absolute inset-0 -z-10 rounded-xl bg-gradient-to-r from-blue-400/40 via-purple-400/40 to-transparent blur-xl dark:hidden" />
          
          <div className="bg-zinc-900/70 dark:bg-zinc-800/50 backdrop-blur-md rounded-xl p-4 border border-zinc-800 dark:border-zinc-700/50 shadow-inner">
            <PnlChart data={pnlData.chartPoints} height={180} />
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="space-y-2">
        <MenuButton icon={HelpCircle} label="Help & Support" onClick={() => handleComingSoon("Help & Support")} />
        <MenuButton icon={ExternalLink} label="View on Basescan" external onClick={handleBaseScan} />
        {!isFarcasterContext && <MenuButton icon={LogOut} label="Disconnect Wallet" onClick={disconnect} destructive />}
      </div>

      {/* Coming Soon Dialog */}
      <Dialog open={comingSoonOpen} onOpenChange={setComingSoonOpen}>
        <DialogContent className="max-w-xs bg-background dark:bg-zinc-900 border-border dark:border-zinc-700">
          <DialogHeader>
            <DialogTitle className="text-center text-foreground dark:text-white">{comingSoonFeature}</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <div className="h-12 w-12 rounded-full bg-blue-500/20 mx-auto mb-3 flex items-center justify-center">
              <HelpCircle className="h-6 w-6 text-blue-400" />
            </div>
            <p className="text-muted-foreground dark:text-zinc-400 text-sm">This feature is coming soon. Stay tuned for updates!</p>
          </div>
          <Button onClick={() => setComingSoonOpen(false)} className="w-full bg-secondary hover:bg-secondary/80 text-foreground dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white">
            Got it
          </Button>
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
      className={`w-full flex items-center justify-between px-4 py-3.5 bg-secondary/60 dark:bg-zinc-800/60 rounded-xl hover:bg-secondary/80 dark:hover:bg-zinc-700/60 transition-colors border border-border dark:border-zinc-700/30 ${
        destructive ? "text-destructive" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className={`h-4 w-4 ${destructive ? "text-destructive" : "text-muted-foreground dark:text-zinc-400"}`} />
        <span className={`text-sm font-medium ${destructive ? "text-destructive" : "text-foreground dark:text-white"}`}>{label}</span>
      </div>
      {external && <ExternalLink className="h-4 w-4 text-muted-foreground dark:text-zinc-500" />}
    </button>
  )
}
