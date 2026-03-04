"use client"

import { useState, useEffect, useRef } from "react"
import { Home, User, Trophy } from "lucide-react"
import { cn } from "@/lib/utils"
import { HomeTab } from "./tabs/home-tab"
import { ProfileTab } from "./tabs/profile-tab"
import { BetsTab } from "./tabs/positions-tab"
import { Header } from "./header"
import { useModal } from "./providers/modal-provider"
import { useMiniApp } from "./providers/miniapp-provider"
import type { TabType } from "@/lib/types"

export function AppShell() {
  const [activeTab, setActiveTab] = useState<TabType>("home")
  const { isModalOpen } = useModal()
  const { farcasterUser, basenameAvatar, address } = useMiniApp()
  const [navHidden, setNavHidden] = useState(false)
  const lastScrollY = useRef(0)

  const profilePicture = basenameAvatar || farcasterUser?.pfpUrl || null

  useEffect(() => {
    const threshold = 10
    const handleScroll = () => {
      const currentY = window.scrollY
      const delta = currentY - lastScrollY.current

      if (Math.abs(delta) < threshold) return

      if (delta > 0 && currentY > 80) {
        setNavHidden(true)
      } else {
        setNavHidden(false)
      }

      lastScrollY.current = currentY
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 pb-20 md:pb-6 pt-14">
        {activeTab === "home" && <HomeTab />}
        {activeTab === "quests" && <BetsTab />}
        {activeTab === "profile" && <ProfileTab />}
      </main>

      <nav
        className={cn(
          "fixed bottom-0 left-0 right-0 bg-background/90 dark:bg-black/60 backdrop-blur-xl border-t border-border dark:border-white/5 safe-area-inset-bottom z-40 transition-transform duration-300",
          "md:hidden",
          (isModalOpen || navHidden) && "translate-y-full",
        )}
      >
        <div className="flex justify-around items-center h-16 max-w-2xl mx-auto px-4">
          <button
            onClick={() => setActiveTab("home")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 w-20 h-12 rounded-2xl transition-all duration-300",
              activeTab === "home" ? "text-primary dark:text-white" : "text-muted-foreground hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-300",
            )}
          >
            {activeTab === "home" && <div className="absolute inset-0 bg-primary/10 dark:bg-white/10 rounded-2xl" />}
            <Home
              className={cn(
                "h-5 w-5 relative z-10",
                activeTab === "home" && "drop-shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]",
              )}
            />
            <span className="text-[10px] font-semibold relative z-10">Quests</span>
          </button>

          <button
            onClick={() => setActiveTab("quests")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 w-20 h-12 rounded-2xl transition-all duration-300",
              activeTab === "quests" ? "text-primary dark:text-white" : "text-muted-foreground hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-300",
            )}
          >
            {activeTab === "quests" && <div className="absolute inset-0 bg-primary/10 dark:bg-white/10 rounded-2xl" />}
            <Trophy
              className={cn(
                "h-5 w-5 relative z-10",
                activeTab === "quests" && "drop-shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]",
              )}
            />
            <span className="text-[10px] font-semibold relative z-10">My Claims</span>
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={cn(
              "relative flex flex-col items-center justify-center gap-0.5 w-20 h-12 rounded-2xl transition-all duration-300",
              activeTab === "profile" ? "text-primary dark:text-white" : "text-muted-foreground hover:text-foreground dark:text-zinc-500 dark:hover:text-zinc-300",
            )}
          >
            {activeTab === "profile" && <div className="absolute inset-0 bg-primary/10 dark:bg-white/10 rounded-2xl" />}
            {profilePicture ? (
              <img
                src={profilePicture}
                alt=""
                className={cn(
                  "h-5 w-5 rounded-full object-cover relative z-10 ring-1",
                  activeTab === "profile" ? "ring-primary/40 dark:ring-white/40" : "ring-border dark:ring-white/10",
                )}
              />
            ) : (
              <User
                className={cn(
                  "h-5 w-5 relative z-10",
                  activeTab === "profile" && "drop-shadow-[0_0_8px_rgba(0,0,0,0.1)] dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]",
                )}
              />
            )}
            <span className="text-[10px] font-semibold relative z-10">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  )
}
