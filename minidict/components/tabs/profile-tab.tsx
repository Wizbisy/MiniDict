"use client"

import type React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  HelpCircle,
  ExternalLink,
  RefreshCw,
  LogOut,
  Copy,
  Wallet,
  Trophy,
  Bell,
  Check,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useMiniApp } from "@/components/providers/miniapp-provider"
import { getAllQuests, hasUserClaimed } from "@/lib/contracts"
import { formatUSDC } from "@/lib/types"
import type { Quest } from "@/lib/types"
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
    sendTransaction,
    addFrame
  } = useMiniApp()

  const [comingSoonOpen, setComingSoonOpen] = useState(false)
  const [comingSoonFeature, setComingSoonFeature] = useState("")
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [questStats, setQuestStats] = useState<{
    totalClaimed: number
    totalEarned: number
  }>({ totalClaimed: 0, totalEarned: 0 })

  const fetchStats = useCallback(async () => {
    if (!address) return
    try {
      const allQuests = await getAllQuests()
      let totalClaimed = 0
      let totalEarned = 0

      await Promise.all(
        allQuests.map(async (q) => {
          const claimed = await hasUserClaimed(q.id, address)
          if (claimed) {
            totalClaimed++
            totalEarned += q.payoutPerClaim
          }
        })
      )

      setQuestStats({ totalClaimed, totalEarned })
    } catch (error) {
      console.error("Failed to fetch quest stats:", error)
    }
  }, [address])

  useEffect(() => {
    if (isConnected && address) fetchStats()
  }, [isConnected, address, fetchStats])

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
    await fetchStats()
    setIsRefreshing(false)
  }

  const getDisplayName = () => {
    if (isFarcasterContext && farcasterUser) {
      return farcasterUser.displayName || farcasterUser.username || truncateAddress(address!)
    }
    if (basename) return basename
    return truncateAddress(address!)
  }

  const handleComingSoon = (feature: string) => {
    setComingSoonFeature(feature)
    setComingSoonOpen(true)
  }

  const handleEnableNotifications = async () => {
    if (isFarcasterContext) {
      const added = await addFrame()
      if (added) console.log("Notifications prompted safely!")
    } else {
      window.alert("Notifications are native to the Farcaster client. Open this app inside a compatible wallet like Warpcast or Base App to subscribe to notifications.")
    }
  }

  const handleBaseScan = () => {
    if (address) {
      window.open(`https://sepolia.basescan.org/address/${address}`, "_blank")
    }
  }

  const getProfilePicture = () => {
    if (isFarcasterContext && farcasterUser?.pfpUrl) return farcasterUser.pfpUrl
    if (basenameAvatar) return basenameAvatar
    if (farcasterUser?.pfpUrl) return farcasterUser.pfpUrl
    return null
  }

  const profilePicture = getProfilePicture()
  const displayName = getDisplayName()

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
            className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02]"
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
      <div className="bg-linear-to-br from-secondary/80 to-background/80 dark:from-zinc-800/80 dark:to-zinc-900/80 rounded-2xl p-5 border border-border dark:border-zinc-700/50">
        <div className="flex items-start justify-between mb-5">
          <div className="flex items-center gap-4">
            {profilePicture ? (
              <img
                src={profilePicture}
                alt=""
                className="h-14 w-14 rounded-full object-cover ring-2 ring-border dark:ring-zinc-700"
              />
            ) : (
              <div className="h-14 w-14 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center ring-2 ring-border dark:ring-zinc-700">
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

      {/* Quest Stats */}
      {questStats.totalClaimed > 0 && (
        <div className="bg-secondary/60 dark:bg-zinc-800/60 rounded-xl p-4 border border-border dark:border-zinc-700/30">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-primary" />
            <p className="text-sm font-medium text-foreground dark:text-white">Quest Activity</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground dark:text-zinc-500">Quests Completed</p>
              <p className="text-lg font-bold text-foreground dark:text-white">{questStats.totalClaimed}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground dark:text-zinc-500">Total Earned</p>
              <p className="text-lg font-bold text-emerald-500">{formatUSDC(questStats.totalEarned)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items */}
      <div className="space-y-2">
        <MenuButton icon={Bell} label="Enable Notifications" onClick={handleEnableNotifications} />
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
