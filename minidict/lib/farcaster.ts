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
    const normalizedAddress = address.toLowerCase()
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/user/bulk-by-address?addresses=${normalizedAddress}`,
      { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const users = data?.[normalizedAddress]
    return users?.[0]?.fid || null
  } catch {
    return null
  }
}


export async function getUserProfile(fid: number): Promise<{ followerCount: number, powerBadge: boolean } | null> {
  if (!NEYNAR_API_KEY) return null

  try {
    const res = await fetch(
      `${NEYNAR_BASE}/farcaster/user/bulk?fids=${fid}`,
      { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
    )
    if (!res.ok) return null
    const data = await res.json()
    const user = data?.users?.[0]
    if (!user) return null
    
    return {
      followerCount: user.follower_count || 0,
      powerBadge: !!user.power_badge
    }
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


export async function verifyMultipleActions(
  actions: string[],
  targetIdentifier: string,
  userFid: number
): Promise<{ verified: boolean; reason: string }> {
  console.log(`Verifying multiple actions: ${actions.join(", ")} for target: ${targetIdentifier} and user: ${userFid}`);

  if (!NEYNAR_API_KEY) {
    console.warn("NEYNAR_API_KEY not set — skipping action verification");
    return { verified: true, reason: "Verification skipped (dev mode)" };
  }

  try {
    const trimmedTarget = targetIdentifier.trim();
    const hash = extractCastHash(trimmedTarget);
    
    let cast: any = null;
    let targetFid: number | null = null;

    if (hash) {
      console.log(`Target identified as cast hash: ${hash}. Fetching cast details...`);
      const url = `${NEYNAR_BASE}/farcaster/cast?identifier=${hash}&type=hash&viewer_fid=${userFid}`;
      const res = await fetch(url, { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } });
      if (res.ok) {
        const data = await res.json();
        cast = data.cast;
        targetFid = cast?.author?.fid || null;
      } else {
        const err = await res.json().catch(() => ({}));
        console.warn(`Failed to fetch cast ${hash}:`, res.status, err);
      }
    } else if (/^\d+$/.test(trimmedTarget)) {
      targetFid = parseInt(trimmedTarget);
    } else if (trimmedTarget.startsWith("0x")) {
      targetFid = await getFidFromAddress(trimmedTarget);
    } else {
      const username = trimmedTarget.replace(/^@/, "");
      const res = await fetch(
        `${NEYNAR_BASE}/farcaster/user/by_username?username=${username}`,
        { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
      );
      if (res.ok) {
        const data = await res.json();
        targetFid = data?.user?.fid || null;
      }
    }

    for (const action of actions) {
      console.log(`Checking action: ${action}`);
      
      if (action === "like") {
        if (!cast) return { verified: false, reason: "Like action requires a valid cast hash" };
        const liked = cast.viewer_context?.liked === true;
        if (!liked) return { verified: false, reason: "You need to like the cast first" };
      } 
      else if (action === "recast") {
        if (!cast) return { verified: false, reason: "Recast action requires a valid cast hash" };
        const recasted = cast.viewer_context?.recasted === true;
        if (!recasted) return { verified: false, reason: "You need to recast the cast first" };
      }
      else if (action === "follow") {
        if (!targetFid) return { verified: false, reason: "Follow action requires a valid user or author" };
        const res = await fetch(
          `${NEYNAR_BASE}/farcaster/user/bulk?fids=${targetFid}&viewer_fid=${userFid}`,
          { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
        );
        if (res.ok) {
          const data = await res.json();
          const user = data?.users?.[0];
          const following = user?.viewer_context?.following === true;
          if (!following) return { verified: false, reason: `You need to follow FID ${targetFid} first` };
        } else {
          return { verified: false, reason: "Could not verify follow status" };
        }
      }
      else if (action === "custom" || action === "reply") {
        if (!hash) return { verified: false, reason: "Reply action requires a valid cast hash" };
        const res = await fetch(
          `${NEYNAR_BASE}/farcaster/feed/user/casts?fid=${userFid}&limit=100&include_replies=true`,
          { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
        );
        if (!res.ok) {
          return { verified: false, reason: "Could not verify reply status" };
        }

        const data = await res.json();
        const casts = data?.casts || [];
        const normalizedHash = hash.toLowerCase();
        const replied = casts.some((c: any) => {
          const parentHash = (c?.parent_hash || "").toLowerCase();
          const threadHash = (c?.thread_hash || "").toLowerCase();
          return parentHash === normalizedHash || threadHash === normalizedHash;
        });

        if (!replied) return { verified: false, reason: "You need to reply to the cast first" };
      }
    }

    return { verified: true, reason: "All actions verified" };
  } catch (err) {
    console.error("verifyMultipleActions exception:", err);
    return { verified: false, reason: "Verification logic error" };
  }
}

export async function verifyAction(
  actionType: string,
  targetIdentifier: string,
  userFid: number
): Promise<{ verified: boolean; reason: string }> {
  return verifyMultipleActions([actionType], targetIdentifier, userFid);
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

    const isHash = extractCastHash(trimmed)
    if (isHash) {
      const res = await fetch(
        `${NEYNAR_BASE}/farcaster/cast?identifier=${isHash}&type=hash`,
        { headers: { accept: "application/json", api_key: NEYNAR_API_KEY } }
      )
      if (res.ok) {
        const data = await res.json()
        targetFid = data?.cast?.author?.fid || null
      }
    } else if (/^\d+$/.test(trimmed)) {
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
