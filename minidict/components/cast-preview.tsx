"use client"

import { useState, useEffect } from "react"
import { Heart, Repeat2, MessageCircle, Loader2 } from "lucide-react"
import type { CastDetails } from "@/lib/types"

interface CastPreviewProps {
  castHash: string
}

function extractCastHash(identifier: string): string | null {
  const trimmed = identifier.trim()

  if (trimmed.startsWith("http")) {
    const match = trimmed.match(/0x[a-fA-F0-9]{8,}/)
    return match ? match[0] : null
  }

  if (trimmed.startsWith("0x")) return trimmed
  if (/^[a-fA-F0-9]{8,}$/.test(trimmed)) return `0x${trimmed}`

  return null
}

export function CastPreview({ castHash }: CastPreviewProps) {
  const [cast, setCast] = useState<CastDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const hash = extractCastHash(castHash)
        if (!hash) {
          setLoading(false)
          return
        }

        const res = await fetch(`/api/cast?hash=${hash}`)
        if (res.ok) {
          const data = await res.json()
          setCast(data)
        }
      } catch {
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [castHash])

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-3 bg-secondary/40 rounded-lg">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Loading cast...</span>
      </div>
    )
  }

  if (!cast) {
    return (
      <div className="bg-secondary/40 rounded-lg p-3">
        <p className="text-xs text-muted-foreground">Target:</p>
        <p className="text-sm font-mono break-all">{castHash}</p>
      </div>
    )
  }

  return (
    <div className="bg-secondary/40 rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        {cast.author.pfpUrl ? (
          <img
            src={cast.author.pfpUrl}
            alt=""
            className="h-5 w-5 rounded-full object-cover"
          />
        ) : (
          <div className="h-5 w-5 rounded-full bg-primary/20" />
        )}
        <span className="text-xs font-medium">{cast.author.displayName}</span>
        <span className="text-xs text-muted-foreground">@{cast.author.username}</span>
      </div>

      <p className="text-sm text-foreground/90 line-clamp-3">{cast.text}</p>

      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Heart className="h-3 w-3" />
          <span>{cast.engagement.likes}</span>
        </div>
        <div className="flex items-center gap-1">
          <Repeat2 className="h-3 w-3" />
          <span>{cast.engagement.recasts}</span>
        </div>
        <div className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" />
          <span>{cast.engagement.replies}</span>
        </div>
      </div>
    </div>
  )
}
