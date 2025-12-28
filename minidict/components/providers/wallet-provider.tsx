"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

interface WalletState {
  address: string | null
  chainId: number | null
  isConnecting: boolean
  isConnected: boolean
  balance: {
    usdc: number
    matic: number
  }
}

interface WalletContextType extends WalletState {
  connect: () => Promise<void>
  disconnect: () => void
  switchChain: (chainId: number) => Promise<void>
}

const WalletContext = createContext<WalletContextType | null>(null)

export function useWallet() {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [state, setState] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnecting: false,
    isConnected: false,
    balance: {
      usdc: 0,
      matic: 0,
    },
  })

  const connect = useCallback(async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      alert("Please install MetaMask or another Web3 wallet")
      return
    }

    setState((prev) => ({ ...prev, isConnecting: true }))

    try {
      const accounts = (await window.ethereum.request({
        method: "eth_requestAccounts",
      })) as string[]

      const chainId = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string

      setState({
        address: accounts[0],
        chainId: Number.parseInt(chainId, 16),
        isConnecting: false,
        isConnected: true,
        balance: {
          usdc: 1250.5,
          matic: 45.23,
        },
      })
    } catch (error) {
      console.error("Failed to connect wallet:", error)
      setState((prev) => ({ ...prev, isConnecting: false }))
    }
  }, [])

  const disconnect = useCallback(() => {
    setState({
      address: null,
      chainId: null,
      isConnecting: false,
      isConnected: false,
      balance: {
        usdc: 0,
        matic: 0,
      },
    })
  }, [])

  const switchChain = useCallback(async (chainId: number) => {
    if (typeof window === "undefined" || !window.ethereum) return

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      })
      setState((prev) => ({ ...prev, chainId }))
    } catch (error) {
      console.error("Failed to switch chain:", error)
    }
  }, [])

  return (
    <WalletContext.Provider
      value={{
        ...state,
        connect,
        disconnect,
        switchChain,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
      on: (event: string, callback: (...args: unknown[]) => void) => void
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void
    }
  }
}
