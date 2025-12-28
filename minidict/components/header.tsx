"use client"

import { useState, useEffect } from "react"
import { ChevronDown, LogOut, Copy, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useMiniApp } from "./providers/miniapp-provider"
import { cn } from "@/lib/utils"

export function Header() {
  const {
    address,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    balance,
    farcasterUser,
    isFarcasterContext,
    openUrl,
    basename,
  } = useMiniApp()

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
    if (basename) return basename
    if (farcasterUser?.username) return `@${farcasterUser.username}`
    if (address) return truncateAddress(address)
    return ""
  }

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-xl border-b border-border transition-transform duration-300",
        !isVisible && "-translate-y-full",
      )}
    >
      <div className="flex items-center justify-between h-14 px-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <img src="/images/minidict.png" alt="Minidict" className="h-8 w-8 invert" />
          <span className="font-bold text-lg tracking-tight text-foreground">Minidict</span>
        </div>

        {isConnected && address ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 bg-secondary/50 border-border/50 h-9 px-3">
                {farcasterUser?.pfpUrl ? (
                  <img src={farcasterUser.pfpUrl || "/placeholder.svg"} alt="" className="h-5 w-5 rounded-full" />
                ) : (
                  <div className="h-2 w-2 rounded-full bg-primary" />
                )}
                <span className="font-medium text-xs max-w-[100px] truncate">{getDisplayName()}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
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
            className="h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 border-0 shadow-lg shadow-blue-500/25 transition-all duration-300 hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
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
    </header>
  )
}
