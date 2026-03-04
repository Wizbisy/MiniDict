"use client"

import { useState, useEffect, use } from "react"
import { Loader2, ArrowLeft, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { QuestCard } from "@/components/quest-card"
import { ClaimModal } from "@/components/claim-modal"
import { getQuest, hasUserClaimed } from "@/lib/contracts"
import { useMiniApp } from "@/components/providers/miniapp-provider"
import type { Quest } from "@/lib/types"
import Link from "next/link"

export default function QuestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const questId = parseInt(id)
  const [quest, setQuest] = useState<Quest | null>(null)
  const [loading, setLoading] = useState(true)
  const [claimed, setClaimed] = useState(false)
  const [showClaim, setShowClaim] = useState(false)
  const { address } = useMiniApp()

  useEffect(() => {
    async function load() {
      try {
        const q = await getQuest(questId)
        setQuest(q)
        if (q && address) {
          const c = await hasUserClaimed(q.id, address)
          setClaimed(c)
        }
      } catch (err) {
        console.error("Failed to load quest:", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [questId, address])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!quest) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 px-4">
        <h1 className="text-2xl font-bold">Quest Not Found</h1>
        <p className="text-muted-foreground">This quest doesn't exist or has been removed.</p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Quests
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold">Quest #{quest.id}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <QuestCard
          quest={quest}
          userAddress={address ?? undefined}
          hasClaimed={claimed}
        />
      </div>

      {/* Claim Modal */}
      {showClaim && address && (
        <ClaimModal
          quest={quest}
          userAddress={address}
          onClose={() => setShowClaim(false)}
        />
      )}
    </div>
  )
}
