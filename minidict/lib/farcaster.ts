import type { CastDetails } from "./types"

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || ""
const NEYNAR_BASE = "https://api.neynar.com/v2"

export async function getCastByHash(hash: string): Promise<CastDetails | null> {
  if (!NEYNAR_API_KEY) {
    console.warn("NEYNAR_API_KEY not set — returning mock cast data")
    return {
      hash,
      author: {
        fid: 0,
        username: "unknown",
        displayName: "Unknown",
        pfpUrl: "",
      },
      text: `Cast ${hash.slice(0, 10)}...`,
      timestamp: new Date().toISOString(),
      engagement: { likes: 0, recasts: 0, replies: 0 },
    }
  }

  try {
    const response = await fetch(
      `${NEYNAR_BASE}/farcaster/cast?identifier=${hash}&type=hash`,
      {
        headers: {
          accept: "application/json",
          api_key: NEYNAR_API_KEY,
        },
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
      if (cast) {
        results.set(cast.hash, cast)
      }
    }
  }

  return results
}

export function getEngagementValue(
  cast: CastDetails,
  metricType: "likes" | "recasts" | "replies" | "followers"
): number {
  switch (metricType) {
    case "likes":
      return cast.engagement.likes
    case "recasts":
      return cast.engagement.recasts
    case "replies":
      return cast.engagement.replies
    case "followers":
      return 0
    default:
      return 0
  }
}
