"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react"

// Farcaster SDK types
interface FarcasterUser {
  fid: number
  username?: string
  displayName?: string
  pfpUrl?: string
  custody?: string
}

interface WalletState {
  address: string | null
  chainId: number | null
  isConnecting: boolean
  isConnected: boolean
  balance: {
    usdc: number
    eth: number
    usdcPolygon: number
    matic: number
  }
  portfolio: {
    totalValue: number
    openPositionsCount: number
    pnl: number
    isLoading: boolean
  }
  basename: string | null
  basenameAvatar: string | null
}

interface MiniAppContextType extends WalletState {
  farcasterUser: FarcasterUser | null
  isFarcasterContext: boolean
  isFrameReady: boolean
  connect: () => Promise<void>
  disconnect: () => void
  switchChain: (chainId: number) => Promise<void>
  setFrameReady: () => void
  openUrl: (url: string) => void
  close: () => void
  refreshBalances: () => Promise<void>
  refreshPortfolio: () => Promise<void>
}

const MiniAppContext = createContext<MiniAppContextType | null>(null)

export function useMiniApp() {
  const context = useContext(MiniAppContext)
  if (!context) {
    throw new Error("useMiniApp must be used within a MiniAppProvider")
  }
  return context
}

export const useWallet = useMiniApp

interface MiniAppProviderProps {
  children: ReactNode
}

const BASE_CHAIN_ID = 8453

export function MiniAppProvider({ children }: MiniAppProviderProps) {
  const [farcasterUser, setFarcasterUser] = useState<FarcasterUser | null>(null)
  const [isFarcasterContext, setIsFarcasterContext] = useState(false)
  const [isFrameReady, setIsFrameReady] = useState(false)

  const [walletState, setWalletState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnecting: false,
    isConnected: false,
    balance: {
      usdc: 0,
      eth: 0,
      usdcPolygon: 0,
      matic: 0,
    },
    portfolio: {
      totalValue: 0,
      openPositionsCount: 0,
      pnl: 0,
      isLoading: false,
    },
    basename: null,
    basenameAvatar: null,
  })

  const fetchBasename = useCallback(async (address: string) => {
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000)

      const res = await fetch(`/api/basename?address=${address}`, {
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const data = await res.json()
      console.log("Basename API response:", JSON.stringify(data))

      setWalletState((prev) => ({
        ...prev,
        basename: data.basename || null,
        basenameAvatar: data.avatar || null,
      }))
    } catch (err) {
      console.error("Basename fetch error:", err)
    }
  }, [])

  const refreshBalances = useCallback(async () => {
    if (!walletState.address) return

    try {
      const res = await fetch(`/api/balance?address=${walletState.address}`)
      const data = await res.json()

      setWalletState((prev) => ({
        ...prev,
        balance: {
          usdc: data.base?.usdc || 0,
          eth: data.base?.eth || 0,
          usdcPolygon: data.polygon?.usdc || 0,
          matic: data.polygon?.matic || 0,
        },
      }))
    } catch (error) {
      console.error("Failed to fetch balances:", error)
    }
  }, [walletState.address])

  const refreshPortfolio = useCallback(async () => {
    if (!walletState.address) return

    setWalletState((prev) => ({
      ...prev,
      portfolio: { ...prev.portfolio, isLoading: true },
    }))

    try {
      const res = await fetch(`/api/portfolio?address=${walletState.address}`)
      const data = await res.json()

      setWalletState((prev) => ({
        ...prev,
        portfolio: {
          totalValue: data.totalValue || 0,
          openPositionsCount: data.openPositionsCount || 0,
          pnl: data.pnl || 0,
          isLoading: false,
        },
      }))
    } catch (error) {
      console.error("Failed to fetch portfolio:", error)
      setWalletState((prev) => ({
        ...prev,
        portfolio: { ...prev.portfolio, isLoading: false },
      }))
    }
  }, [walletState.address])

  useEffect(() => {
    if (walletState.address && walletState.isConnected) {
      refreshBalances()
      refreshPortfolio()
      fetchBasename(walletState.address)
    }
  }, [walletState.address, walletState.isConnected, refreshBalances, refreshPortfolio, fetchBasename])

  useEffect(() => {
    const initFarcaster = async () => {
      try {
        const sdk = await import("@farcaster/miniapp-sdk").then((m) => m.sdk).catch(() => null)

        if (sdk) {
          const context = await sdk.context

          if (context?.user) {
            setFarcasterUser({
              fid: context.user.fid,
              username: context.user.username,
              displayName: context.user.displayName,
              pfpUrl: context.user.pfpUrl,
            })
            setIsFarcasterContext(true)

            const userWithCustody = context.user as { custody?: string }
            if (userWithCustody.custody) {
              setWalletState((prev) => ({
                ...prev,
                address: userWithCustody.custody || null,
                chainId: BASE_CHAIN_ID,
                isConnected: true,
              }))
            }
          }
        }
      } catch {
        setIsFarcasterContext(false)
      }
    }

    initFarcaster()
  }, [])

  const setFrameReadyAction = useCallback(async () => {
    if (isFrameReady) return

    try {
      const sdk = await import("@farcaster/miniapp-sdk").then((m) => m.sdk).catch(() => null)
      if (sdk) {
        await sdk.actions.ready()
      }
      setIsFrameReady(true)
    } catch {
      setIsFrameReady(true)
    }
  }, [isFrameReady])

  const openUrl = useCallback(async (url: string) => {
    try {
      const sdk = await import("@farcaster/miniapp-sdk").then((m) => m.sdk).catch(() => null)
      if (sdk) {
        await sdk.actions.openUrl(url)
      } else {
        window.open(url, "_blank")
      }
    } catch {
      window.open(url, "_blank")
    }
  }, [])

  const close = useCallback(async () => {
    try {
      const sdk = await import("@farcaster/miniapp-sdk").then((m) => m.sdk).catch(() => null)
      if (sdk) {
        await sdk.actions.close()
      }
    } catch {
      // Not in frame context
    }
  }, [])

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install a Web3 wallet like MetaMask or Coinbase Wallet")
      return
    }

    setWalletState((prev) => ({ ...prev, isConnecting: true }))

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[]

      const chainId = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string

      const currentChainId = Number.parseInt(chainId, 16)

      if (currentChainId !== BASE_CHAIN_ID) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
          })
        } catch (switchError: unknown) {
          if ((switchError as { code?: number })?.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [
                {
                  chainId: `0x${BASE_CHAIN_ID.toString(16)}`,
                  chainName: "Base",
                  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
                  rpcUrls: ["https://mainnet.base.org"],
                  blockExplorerUrls: ["https://basescan.org"],
                },
              ],
            })
          }
        }
      }

      setWalletState((prev) => ({
        ...prev,
        address: accounts[0],
        chainId: BASE_CHAIN_ID,
        isConnecting: false,
        isConnected: true,
      }))
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      setWalletState((prev) => ({ ...prev, isConnecting: false }))
    }
  }, [])

  const disconnect = useCallback(() => {
    setWalletState({
      address: null,
      chainId: null,
      isConnecting: false,
      isConnected: false,
      balance: { usdc: 0, eth: 0, usdcPolygon: 0, matic: 0 },
      portfolio: { totalValue: 0, openPositionsCount: 0, pnl: 0, isLoading: false },
      basename: null,
      basenameAvatar: null,
    })
  }, [])

  const switchChain = useCallback(async (chainId: number) => {
    if (typeof window === "undefined" || !window.ethereum) return

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })
      setWalletState((prev) => ({ ...prev, chainId }))
    } catch (error) {
      console.error("Failed to switch chain:", error)
    }
  }, [])

  return (
    <MiniAppContext.Provider
      value={{
        ...walletState,
        farcasterUser,
        isFarcasterContext,
        isFrameReady,
        connect,
        disconnect,
        switchChain,
        setFrameReady: setFrameReadyAction,
        openUrl,
        close,
        refreshBalances,
        refreshPortfolio,
      }}
    >
      {children}
    </MiniAppContext.Provider>
  )
}

export const WalletProvider = MiniAppProvider

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}
