"use client"

import { useEffect } from "react"
import { AppShell } from "@/components/app-shell"
import { useMiniApp } from "@/components/providers/miniapp-provider"

export default function Home() {
  const { setFrameReady, isFrameReady } = useMiniApp()

  useEffect(() => {
    if (!isFrameReady) {
      setFrameReady()
    }
  }, [setFrameReady, isFrameReady])

  return <AppShell />
}
