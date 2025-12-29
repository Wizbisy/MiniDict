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

let farcasterProvider: {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
} | null = null

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

  const connectWithFarcaster = useCallback(async () => {
    if (!farcasterProvider) return false

    try {
      setWalletState((prev) => ({ ...prev, isConnecting: true }))

      const accounts = (await farcasterProvider.request({
        method: "eth_requestAccounts",
      })) as string[]

      if (accounts && accounts.length > 0) {
        setWalletState((prev) => ({
          ...prev,
          address: accounts[0],
          chainId: BASE_CHAIN_ID,
          isConnecting: false,
          isConnected: true,
        }))
        return true
      }
    } catch (error) {
      console.error("Failed to connect with Farcaster:", error)
    }

    setWalletState((prev) => ({ ...prev, isConnecting: false }))
    return false
  }, [])

  const autoConnectBrowserWallet = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) return false

    try {
      // Check if already connected (don't prompt, just check existing accounts)
      const accounts = (await window.ethereum.request({
        method: "eth_accounts", // This doesn't prompt, just returns connected accounts
      })) as string[]

      if (accounts && accounts.length > 0) {
        const chainId = (await window.ethereum.request({
          method: "eth_chainId",
        })) as string

        const currentChainId = Number.parseInt(chainId, 16)

        setWalletState((prev) => ({
          ...prev,
          address: accounts[0],
          chainId: currentChainId,
          isConnected: true,
        }))

        // Auto switch to Base if not on Base
        if (currentChainId !== BASE_CHAIN_ID) {
          try {
            await window.ethereum.request({
              method: "wallet_switchEthereumChain",
              params: [{ chainId: `0x${BASE_CHAIN_ID.toString(16)}` }],
            })
            setWalletState((prev) => ({ ...prev, chainId: BASE_CHAIN_ID }))
          } catch {
            // Ignore switch errors on auto-connect
          }
        }
        return true
      }
    } catch (error) {
      console.error("Auto-connect check failed:", error)
    }
    return false
  }, [])

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

            try {
              const provider = await sdk.wallet.getEthereumProvider()
              if (provider) {
                farcasterProvider = provider as typeof farcasterProvider

                const accounts = (await provider.request({
                  method: "eth_requestAccounts",
                })) as string[]

                if (accounts && accounts.length > 0) {
                  setWalletState((prev) => ({
                    ...prev,
                    address: accounts[0],
                    chainId: BASE_CHAIN_ID,
                    isConnected: true,
                  }))
                }
              }
            } catch (walletError) {
              console.error("Failed to get Farcaster wallet:", walletError)
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

            try {
              await sdk.actions.ready()
              setIsFrameReady(true)
            } catch {
              setIsFrameReady(true)
            }
            return // Exit early if Farcaster context found
          }
        }
      } catch {
        setIsFarcasterContext(false)
      }

      await autoConnectBrowserWallet()
    }

    initFarcaster()

    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accts = accounts as string[]
        if (accts.length === 0) {
          // Disconnected
          setWalletState((prev) => ({
            ...prev,
            address: null,
            isConnected: false,
          }))
        } else {
          setWalletState((prev) => ({
            ...prev,
            address: accts[0],
            isConnected: true,
          }))
        }
      }

      const handleChainChanged = (chainId: unknown) => {
        const id = Number.parseInt(chainId as string, 16)
        setWalletState((prev) => ({ ...prev, chainId: id }))
      }

      window.ethereum.on("accountsChanged", handleAccountsChanged)
      window.ethereum.on("chainChanged", handleChainChanged)

      return () => {
        window.ethereum?.removeListener("accountsChanged", handleAccountsChanged)
        window.ethereum?.removeListener("chainChanged", handleChainChanged)
      }
    }
  }, [autoConnectBrowserWallet])

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
    // Try Farcaster provider first if in Farcaster context
    if (isFarcasterContext && farcasterProvider) {
      const success = await connectWithFarcaster()
      if (success) return
    }

    // Fallback to browser wallet
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
  }, [isFarcasterContext, connectWithFarcaster])

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
    const provider = farcasterProvider || window.ethereum
    if (!provider) return

    try {
      await provider.request({
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
