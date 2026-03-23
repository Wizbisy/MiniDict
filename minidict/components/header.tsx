"use client"

import { useState, useEffect } from "react"
import { ChevronDown, LogOut, Copy, ExternalLink, Home, Trophy, Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useMiniApp } from "./providers/miniapp-provider"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"
import type { TabType } from "@/lib/types"

interface HeaderProps {
  activeTab: TabType
  setActiveTab: (tab: TabType) => void
}

export function Header({ activeTab, setActiveTab }: HeaderProps) {
  const {
    address,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    balance,
    farcasterUser,
    isFarcasterContext,
    basename,
    basenameAvatar,
  } = useMiniApp()
  const { theme, setTheme } = useTheme()

  const [isVisible, setIsVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY < 10) {
        setIsVisible(true)
      } else if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setIsVisible(false)
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [lastScrollY])

  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`
  }

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
    }
  }

  const viewOnExplorer = () => {
    if (address) {
      window.open(`https://basescan.org/address/${address}`, "_blank")
    }
  }

  const getDisplayName = () => {
    if (isFarcasterContext && farcasterUser) return farcasterUser.displayName || farcasterUser.username || truncateAddress(address!)
    if (basename) return basename
    if (farcasterUser) return farcasterUser.displayName || farcasterUser.username || truncateAddress(address!)
    if (address) return truncateAddress(address)
    return ""
  }

  const profilePicture = isFarcasterContext && farcasterUser?.pfpUrl ? farcasterUser.pfpUrl : (basenameAvatar || farcasterUser?.pfpUrl || null)

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-background/80 dark:bg-transparent backdrop-blur-md border-b border-border dark:border-white/6 transition-transform duration-300",
        !isVisible && "-translate-y-full",
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 md:px-8">
        {/* Logo — extreme left */}
        <div className="flex items-center gap-2 shrink-0">
          <img src="/images/minidict.png" alt="Minidict" className="h-8 w-8 dark:invert opacity-90" />
          <span className="font-bold text-lg tracking-tight text-foreground/90">Minidict</span>
        </div>

        {/* Desktop Nav Tabs — centered, hidden on mobile */}
        <nav className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          <button
            onClick={() => setActiveTab("home")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === "home"
                ? "bg-secondary text-foreground dark:bg-white/10 dark:text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-white/5",
            )}
          >
            <Home className="h-4 w-4" />
            Quests
          </button>

          <button
            onClick={() => setActiveTab("quests")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === "quests"
                ? "bg-secondary text-foreground dark:bg-white/10 dark:text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-white/5",
            )}
          >
            <Trophy className="h-4 w-4" />
            My Claims
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              activeTab === "profile"
                ? "bg-secondary text-foreground dark:bg-white/10 dark:text-white"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 dark:text-zinc-500 dark:hover:text-zinc-200 dark:hover:bg-white/5",
            )}
          >
            {profilePicture ? (
              <img src={profilePicture} alt="" className="h-5 w-5 rounded-full object-cover ring-1 ring-white/20" />
            ) : (
              <div className="h-5 w-5 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <span className="text-[8px] font-bold text-white">
                  {address ? address.slice(2, 4).toUpperCase() : "?"}
                </span>
              </div>
            )}
            Profile
          </button>
        </nav>

        {/* Wallet / Connect — extreme right */}
        <div className="shrink-0 flex items-center gap-2">
          {/* Theme Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="h-9 w-9 bg-secondary/50 hover:bg-secondary/80 text-muted-foreground hover:text-foreground dark:bg-white/5 dark:hover:bg-white/10 dark:text-zinc-400 dark:hover:text-zinc-200"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {isConnected && address ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 bg-secondary hover:bg-secondary/80 border-border dark:bg-white/5 dark:border-white/10 dark:hover:bg-white/10 h-9 px-3">
                  {profilePicture ? (
                    <img src={profilePicture} alt="" className="h-5 w-5 rounded-full object-cover" />
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">{address.slice(2, 4).toUpperCase()}</span>
                    </div>
                  )}
                  <span className="font-medium text-xs max-w-[100px] truncate">{getDisplayName()}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-background dark:bg-zinc-900 border-border dark:border-zinc-800 text-foreground dark:text-white">
                {farcasterUser && (
                  <>
                    <div className="px-2 py-2">
                      <p className="font-medium">{farcasterUser.displayName || farcasterUser.username}</p>
                      <p className="text-xs text-muted-foreground">FID: {farcasterUser.fid}</p>
                    </div>
                    <DropdownMenuSeparator />
                  </>
                )}
                <div className="px-2 py-2">
                  <p className="text-xs text-muted-foreground">Balance</p>
                  <p className="font-semibold">${balance.usdc.toFixed(2)} USDC</p>
                  <p className="text-xs text-muted-foreground">{balance.eth.toFixed(4)} ETH</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={copyAddress}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Address
                </DropdownMenuItem>
                <DropdownMenuItem onClick={viewOnExplorer}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Basescan
                </DropdownMenuItem>
                {!isFarcasterContext && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={disconnect} className="text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Disconnect
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={connect}
              disabled={isConnecting}
              size="sm"
              className="h-9 px-4 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
            >
              {isConnecting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Connecting...</span>
                </div>
              ) : (
                <span className="font-semibold">Connect Wallet</span>
              )}
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
