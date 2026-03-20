"use client"

import { useState, useEffect } from "react"
import { Target, Heart, Repeat2, UserPlus, Sparkles, Clock, DollarSign, Users, Share2, Check, ExternalLink, MessageCircle, BadgeCheck } from "lucide-react"
import { Card } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { formatUSDC, formatDeadline, getRemainingClaimsText, ACTION_TYPE_LABELS, decodeActionMask } from "@/lib/types"
import { ClaimModal } from "./claim-modal"
import { CastPreview } from "./cast-preview"
import { useMiniApp } from "./providers/miniapp-provider"
import type { Quest, ActionType } from "@/lib/types"

interface QuestCardProps {
  quest: Quest
  userAddress?: string
  hasClaimed?: boolean
  onClaimed?: () => void
}

const actionIcons: Record<ActionType, typeof Heart> = {
  like: Heart,
  recast: Repeat2,
  follow: UserPlus,
  mint_nft: Sparkles,
  custom: MessageCircle,
}

const actionColors: Record<ActionType, string> = {
  like: "text-rose-400",
  recast: "text-emerald-400",
  follow: "text-blue-400",
  mint_nft: "text-purple-400",
  custom: "text-amber-400",
}

function getTargetUrl(quest: Quest): string | null {
  const target = quest.targetIdentifier.trim()
  if (!target) return null

  const actions = decodeActionMask(quest.actionMask)
  if (actions.length === 1 && actions[0] === "follow") {
    if (target.startsWith("0x") || /^\d+$/.test(target)) {
      return `https://warpcast.com/~/profiles/${target}`
    }
    const username = target.startsWith("@") ? target.slice(1) : target
    return `https://warpcast.com/${username}`
  }

  if (target.startsWith("http")) return target
  const hash = target.startsWith("0x") ? target : `0x${target}`
  return `https://warpcast.com/~/conversations/${hash}`
}

function isCastAction(quest: Quest): boolean {
  const actions = decodeActionMask(quest.actionMask)
  return actions.some(a => a === "like" || a === "recast" || a === "custom")
}

export function QuestCard({ quest, userAddress, hasClaimed = false, onClaimed }: QuestCardProps) {
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [timeLeft, setTimeLeft] = useState(formatDeadline(quest.deadline))
  const [copied, setCopied] = useState(false)
  const [actionVerified, setActionVerified] = useState<boolean | null>(null)
  const [verifyReason, setVerifyReason] = useState("")
  const { openUrl, farcasterUser, isFarcasterContext } = useMiniApp()

  const actions = decodeActionMask(quest.actionMask)
  const remaining = quest.maxClaims - quest.claimCount
  const progress = quest.maxClaims > 0 ? (quest.claimCount / quest.maxClaims) * 100 : 0
  const isExpired = Date.now() / 1000 >= quest.deadline
  const isFullyClaimed = remaining <= 0
  const isCreator = userAddress ? quest.creator.toLowerCase() === userAddress.toLowerCase() : false
  const canClaim = quest.isActive && !isExpired && !isFullyClaimed && !hasClaimed && !isCreator
  const targetUrl = getTargetUrl(quest)

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(formatDeadline(quest.deadline))
    }, 60000)
    return () => clearInterval(interval)
  }, [quest.deadline])

  useEffect(() => {
    if (!canClaim || !userAddress) return
    setActionVerified(null)
    const url = `/api/verify?questId=${quest.id}&address=${userAddress}${farcasterUser ? `&fid=${farcasterUser.fid}` : ''}`
    fetch(url)
      .then(r => r.json())
      .then(data => {
        setActionVerified(data.verified === true)
        if (!data.verified) setVerifyReason(data.reason || "Action not completed")
      })
      .catch(() => setActionVerified(null))
  }, [quest.id, userAddress, canClaim, farcasterUser])

  const copyQuestLink = async () => {
    const isWarpcast = isFarcasterContext
    
    let url = ""
    if (isWarpcast) {
      url = `https://farcaster.xyz/miniapps/1rBFkBxwEIg_/minidict/quest/${quest.id}`
    } else {
      url = `https://base.app/app/www.minidict.app/quest/${quest.id}`
    }
    
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenTarget = () => {
    if (targetUrl) {
      openUrl(targetUrl)
    }
  }

  return (
    <>
      <Card className="p-4 hover:bg-card/80 transition-all duration-200 rounded-xl border-border/50">
        <div className="flex items-start gap-3 mb-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
            "bg-linear-to-br from-primary/20 to-primary/5 cursor-help"
          )} title={actions.map(a => ACTION_TYPE_LABELS[a]).join(" + ")}>
            {actions.length === 1 ? (
              (() => {
                const Icon = actionIcons[actions[0]]
                return <Icon className={cn("h-5 w-5", actionColors[actions[0]])} />
              })()
            ) : (
              <div className="flex flex-wrap gap-1 items-center justify-center p-1">
                {actions.slice(0, 4).map(action => {
                  const Icon = actionIcons[action]
                  return <Icon key={action} className={cn("h-3 w-3", actionColors[action])} />
                })}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
              {actions.map(action => (
                <span key={action} className={cn("text-xs font-medium px-2 py-0.5 rounded-full", actionColors[action], "bg-current/10")}>
                  {ACTION_TYPE_LABELS[action]}
                </span>
              ))}
              {quest.minFollowers > 0 && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground flex items-center gap-1">
                  <Users className="h-3 w-3" /> {quest.minFollowers}+ Followers
                </span>
              )}
              {quest.requirePowerBadge && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[#8A63D2]/10 text-[#8A63D2] border border-[#8A63D2]/20 shadow-[0_0_8px_rgba(138,99,210,0.15)] flex items-center gap-1">
                  <BadgeCheck className="h-3 w-3" /> Farcaster Pro
                </span>
              )}
            </div>
            <p className="text-sm font-semibold text-foreground">
              Earn {formatUSDC(quest.payoutPerClaim)} per claim
            </p>
          </div>
          {/* Share Button */}
          <button
            onClick={copyQuestLink}
            className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
            title="Copy quest link"
          >
            {copied
              ? <Check className="h-4 w-4 text-emerald-500" />
              : <Share2 className="h-4 w-4 text-muted-foreground" />
            }
          </button>
        </div>

        {/* Embedded Cast Preview (for like/recast quests) */}
        {isCastAction(quest) && (
          <div className="mb-3">
            <CastPreview castHash={quest.targetIdentifier} />
          </div>
        )}

        {/* Follow target (for follow quests) */}
        {actions.length === 1 && actions[0] === "follow" && (
          <div className="mb-3 bg-secondary/40 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">Follow target:</p>
            <p className="text-sm font-medium font-mono">{quest.targetIdentifier}</p>
          </div>
        )}

        {/* Go Complete Action Button — always visible so users can visit the target */}
        {targetUrl && (
          <button
            onClick={handleOpenTarget}
            className="flex items-center justify-center gap-2 w-full p-2.5 mb-3 rounded-lg bg-secondary/70 hover:bg-secondary transition-all text-sm font-medium text-foreground hover:scale-[1.01] active:scale-[0.99]"
          >
            <ExternalLink className="h-4 w-4" />
            {actions.length > 1 ? "Complete Required Actions" : "Complete Action"}
          </button>
        )}

        {/* Claims Progress */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>{getRemainingClaimsText(quest)}</span>
            <span>{progress.toFixed(0)}% claimed</span>
          </div>
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                progress >= 100 ? "bg-muted-foreground" : "bg-linear-to-r from-primary to-emerald-500"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            <span>{formatUSDC(quest.payoutPerClaim * quest.maxClaims)} total</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{quest.claimCount} claimed</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{timeLeft}</span>
          </div>
        </div>

        {/* Action Button */}
        {isCreator ? (
          <div className="text-center py-2 rounded-lg text-sm font-medium bg-secondary text-muted-foreground">
            Your quest
          </div>
        ) : canClaim ? (
          actionVerified === false ? (
            <div className="text-center py-2 rounded-lg text-sm font-medium bg-amber-500/10 text-amber-500">
              ⚠ {verifyReason}
            </div>
          ) : (
            <button
              onClick={() => setShowClaimModal(true)}
              disabled={actionVerified === null}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
            >
              <span className="font-semibold text-sm text-primary">
                {actionVerified === null ? "Verifying..." : "Claim Reward"}
              </span>
              <span className="font-bold text-sm tabular-nums text-primary">
                {formatUSDC(quest.payoutPerClaim)}
              </span>
            </button>
          )
        ) : (
          <div className={cn(
            "text-center py-2 rounded-lg text-sm font-medium",
            hasClaimed
              ? "bg-emerald-500/10 text-emerald-500"
              : isFullyClaimed
              ? "bg-secondary text-muted-foreground"
              : !quest.isActive
              ? "bg-red-500/10 text-red-500"
              : "bg-secondary text-muted-foreground"
          )}>
            {hasClaimed
              ? "✓ Already claimed"
              : isFullyClaimed
              ? "All rewards claimed"
              : !quest.isActive
              ? "Quest deactivated"
              : "Quest expired"}
          </div>
        )}
      </Card>

      {/* Claim Modal */}
      {showClaimModal && userAddress && (
        <ClaimModal
          quest={quest}
          userAddress={userAddress}
          onClose={() => {
            setShowClaimModal(false)
            onClaimed?.()
          }}
        />
      )}
    </>
  )
}
