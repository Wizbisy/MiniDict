import type { CastDetails } from "./types"

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || ""
const NEYNAR_BASE = "https://api.neynar.com/v2"


export function extractCastHash(identifier: string): string | null {
  const trimmed = identifier.trim()
  if (trimmed.startsWith("http")) {
    const match = trimmed.match(/0x[a-fA-F0-9]{8,}/)
    return match ? match[0] : null
  }
  if (trimmed.startsWith("0x")) return trimmed
  if (/^[a-fA-F0-9]{8,}$/.test(trimmed)) return `0x${trimmed}`
  return null
}


export async function getFidFromAddress(address: string): Promise<number | null> {
  if (!NEYNAR_API_KEY) return null

  try {
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/user/by_verification?address=${address.toLowerCase()}`,
      { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data?.user?.fid || null
  } catch {
    return null
  }
}


export async function getAddressesForFid(fid: number): Promise<string[]> {
  if (!NEYNAR_API_KEY) return []

  try {
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/user/bulk?fids=${fid}`,
      { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
    )
    if (!res.ok) return []
    const data = await res.json()
    const user = data?.users?.[0]
    if (!user) return []

    const addresses: string[] = []
    if (user.verified_addresses?.eth_addresses) {
      addresses.push(...user.verified_addresses.eth_addresses.map((a: string) => a.toLowerCase()))
    }
    if (user.custody_address) {
      addresses.push(user.custody_address.toLowerCase())
    }
    return addresses
  } catch {
    return []
  }
}


export async function verifyAction(
  actionType: string,
  targetIdentifier: string,
  userFid: number
): Promise<{ verified: boolean; reason: string }> {
  if (!NEYNAR_API_KEY) {
    console.warn("NEYNAR_API_KEY not set — skipping action verification")
    return { verified: true, reason: "Verification skipped (dev mode)" }
  }

  switch (actionType) {
    case "like":
      return verifyLiked(targetIdentifier, userFid)
    case "recast":
      return verifyRecasted(targetIdentifier, userFid)
    case "follow":
      return verifyFollow(targetIdentifier, userFid)
    case "custom": 
      return verifyReplied(targetIdentifier, userFid)
    default:
      return { verified: true, reason: "No verification for this action type" }
  }
}

async function verifyLiked(
  targetIdentifier: string,
  viewerFid: number
): Promise<{ verified: boolean; reason: string }> {
  const hash = extractCastHash(targetIdentifier)
  if (!hash) return { verified: false, reason: "Invalid cast hash" }

  try {
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/cast?identifier=${hash}&type=hash&viewer_fid=${viewerFid}`,
      { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
    )
    if (!res.ok) return { verified: false, reason: "Could not verify — cast not found" }

    const data = await res.json()
    const liked = data?.cast?.viewer_context?.liked === true
    return liked
      ? { verified: true, reason: "Cast liked" }
      : { verified: false, reason: "You need to like this cast first" }
  } catch {
    return { verified: false, reason: "Verification failed — try again" }
  }
}

async function verifyRecasted(
  targetIdentifier: string,
  viewerFid: number
): Promise<{ verified: boolean; reason: string }> {
  const hash = extractCastHash(targetIdentifier)
  if (!hash) return { verified: false, reason: "Invalid cast hash" }

  try {
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/cast?identifier=${hash}&type=hash&viewer_fid=${viewerFid}`,
      { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
    )
    if (!res.ok) return { verified: false, reason: "Could not verify — cast not found" }

    const data = await res.json()
    const recasted = data?.cast?.viewer_context?.recasted === true
    return recasted
      ? { verified: true, reason: "Cast recasted" }
      : { verified: false, reason: "You need to recast this first" }
  } catch {
    return { verified: false, reason: "Verification failed — try again" }
  }
}

async function verifyFollow(
  targetIdentifier: string,
  viewerFid: number
): Promise<{ verified: boolean; reason: string }> {
  try {
    let targetFid: number | null = null
    const trimmed = targetIdentifier.trim()

    if (/^\d+$/.test(trimmed)) {
      targetFid = parseInt(trimmed)
    } else {
      const username = trimmed.replace(/^@/, "")
      const res = await fetch(
        `${NEYNAR_BASE}/farcaster/user/by_username?username=${username}`,
        { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
      )
      if (res.ok) {
        const data = await res.json()
        targetFid = data?.user?.fid || null
      }
    }

    if (!targetFid) return { verified: false, reason: "Could not find the target user" }

    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/user/bulk?fids=${targetFid}&viewer_fid=${viewerFid}`,
      { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
    )
    if (!res.ok) return { verified: false, reason: "Verification failed — try again" }

    const data = await res.json()
    const user = data?.users?.[0]
    const following = user?.viewer_context?.following === true
    return following
      ? { verified: true, reason: "Following user" }
      : { verified: false, reason: "You need to follow this user first" }
  } catch {
    return { verified: false, reason: "Verification failed — try again" }
  }
}

async function verifyReplied(
  targetIdentifier: string,
  viewerFid: number
): Promise<{ verified: boolean; reason: string }> {
  const hash = extractCastHash(targetIdentifier)
  if (!hash) return { verified: false, reason: "Invalid cast hash" }

  try {
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/cast/conversation?identifier=${hash}&type=hash&reply_depth=1&limit=50`,
      { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
    )
    if (!res.ok) return { verified: false, reason: "Could not verify — cast not found" }

    const data = await res.json()
    const replies = data?.conversation?.cast?.direct_replies || []
    const replied = replies.some((r: any) => r?.author?.fid === viewerFid)
    return replied
      ? { verified: true, reason: "Replied to cast" }
      : { verified: false, reason: "You need to reply to this cast first" }
  } catch {
    return { verified: false, reason: "Verification failed — try again" }
  }
}

export async function getCastByHash(hash: string): Promise<CastDetails | null> {
  if (!NEYNAR_API_KEY) {
    console.warn("NEYNAR_API_KEY not set — returning mock cast data")
    return {
      hash,
      author: { fid: 0, username: "unknown", displayName: "Unknown", pfpUrl: "" },
      text: `Cast ${hash.slice(0, 10)}...`,
      timestamp: new Date().toISOString(),
      engagement: { likes: 0, recasts: 0, replies: 0 },
    }
  }

  try {
    const response = await fetch(
      `${NEYNAR_BASE}/farcaster/cast?identifier=${hash}&type=hash`,
      {
        headers: { accept: "application/json", api_key: NEYNAR_API_KEY },
        next: { revalidate: 30 },
      }
    )

    if (!response.ok) {
      console.error(`Neynar API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    const cast = data.cast
    if (!cast) return null

    return {
      hash: cast.hash,
      author: {
        fid: cast.author?.fid || 0,
        username: cast.author?.username || "unknown",
        displayName: cast.author?.display_name || "Unknown",
        pfpUrl: cast.author?.pfp_url || "",
      },
      text: cast.text || "",
      timestamp: cast.timestamp || new Date().toISOString(),
      engagement: {
        likes: cast.reactions?.likes_count || 0,
        recasts: cast.reactions?.recasts_count || 0,
        replies: cast.replies?.count || 0,
      },
    }
  } catch (error) {
    console.error("Failed to fetch cast:", error)
    return null
  }
}

export async function getCastsEngagement(hashes: string[]): Promise<Map<string, CastDetails>> {
  const results = new Map<string, CastDetails>()
  const batchSize = 5
  for (let i = 0; i < hashes.length; i += batchSize) {
    const batch = hashes.slice(i, i + batchSize)
    const castDetails = await Promise.all(batch.map(getCastByHash))
    for (const cast of castDetails) {
      if (cast) results.set(cast.hash, cast)
    }
  }
  return results
}

export function getEngagementValue(
  cast: CastDetails,
  metricType: "likes" | "recasts" | "replies" | "followers"
): number {
  switch (metricType) {
    case "likes": return cast.engagement.likes
    case "recasts": return cast.engagement.recasts
    case "replies": return cast.engagement.replies
    case "followers": return 0
    default: return 0
  }
}
