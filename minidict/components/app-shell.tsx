"use client"

import { useState } from "react"
import { Home, User, BarChart3 } from "lucide-react"
import { cn } from "@/lib/utils"
import { HomeTab } from "./tabs/home-tab"
import { ProfileTab } from "./tabs/profile-tab"
import { PositionsTab } from "./tabs/positions-tab"
import { Header } from "./header"
import { useModal } from "./providers/modal-provider"
import type { TabType } from "@/lib/types"

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabType>("home")
  const { isModalOpen } = useModal()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 pb-20 pt-14">
        {activeTab === "home" && <HomeTab />}
        {activeTab === "positions" && <PositionsTab />}
        {activeTab === "profile" && <ProfileTab />}
      </main>

      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-black/60 backdrop-blur-xl border-t border-white/5 safe-area-inset-bottom z-40 transition-transform duration-300",
          isModalOpen && "translate-y-full",
        )}
      >
        <div className="flex justify-around items-center h-16 max-w-md mx-auto px-4">
          <button
            onClick={() => setActiveTab("home")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 w-20 h-12 rounded-2xl transition-all duration-300",
              activeTab === "home" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {activeTab === "home" && <div className="absolute inset-0 bg-white/10 rounded-2xl" />}
            <Home
              className={cn(
                "h-5 w-5 relative z-10",
                activeTab === "home" && "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]",
              )}
            />
            <span className="text-[10px] font-semibold relative z-10">Markets</span>
          </button>

          <button
            onClick={() => setActiveTab("positions")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 w-20 h-12 rounded-2xl transition-all duration-300",
              activeTab === "positions" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {activeTab === "positions" && <div className="absolute inset-0 bg-white/10 rounded-2xl" />}
            <BarChart3
              className={cn(
                "h-5 w-5 relative z-10",
                activeTab === "positions" && "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]",
              )}
            />
            <span className="text-[10px] font-semibold relative z-10">Positions</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 w-20 h-12 rounded-2xl transition-all duration-300",
              activeTab === "profile" ? "text-white" : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {activeTab === "profile" && <div className="absolute inset-0 bg-white/10 rounded-2xl" />}
            <User
              className={cn(
                "h-5 w-5 relative z-10",
                activeTab === "profile" && "drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]",
              )}
            />
            <span className="text-[10px] font-semibold relative z-10">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
