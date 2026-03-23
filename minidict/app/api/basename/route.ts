import { NextResponse } from "next/server"
import { createPublicClient, http, namehash } from "viem"
import { base } from "viem/chains"

const BASE_L2_RESOLVER = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD"

const RESOLVER_ABI = [
  {
    inputs: [
      { name: "node", type: "bytes32" },
      { name: "key", type: "string" },
    ],
    name: "text",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const

const baseClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL as string),
})

async function fetchAvatarFromChain(basename: string): Promise<string | null> {
  try {
    const node = namehash(basename)
    const avatar = await baseClient.readContract({
      address: BASE_L2_RESOLVER,
      abi: RESOLVER_ABI,
      functionName: "text",
      args: [node, "avatar"],
    })
    if (avatar && avatar.length > 0) {
      return avatar
    }
    return null
  } catch (error) {
    console.error("Error fetching avatar from chain:", error)
    return null
  }
}

function generateAvatarFromAddress(address: string): string {
  return `https://effigy.im/a/${address}.png`
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const address = searchParams.get("address")

  if (!address) {
    return NextResponse.json({ error: "Address required" }, { status: 400 })
  }

  try {
    const response = await fetch(`https://api.web3.bio/profile/${address}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    })

    if (response.ok) {
      const data = await response.json()

      if (Array.isArray(data) && data.length > 0) {
        const baseProfile = data.find((p: { platform: string }) => p.platform === "basenames")
        if (baseProfile) {
          const basename = baseProfile.identity || baseProfile.displayName
          let avatar = baseProfile.avatar

          if (!avatar && basename) {
            avatar = await fetchAvatarFromChain(basename)
          }

          if (!avatar) {
            avatar = generateAvatarFromAddress(address)
          }

          return NextResponse.json({ basename, avatar })
        }

        const ensProfile = data.find((p: { platform: string }) => p.platform === "ens")
        if (ensProfile) {
          return NextResponse.json({
            basename: ensProfile.identity || ensProfile.displayName,
            avatar: ensProfile.avatar || generateAvatarFromAddress(address),
          })
        }

        const farcasterProfile = data.find((p: { platform: string }) => p.platform === "farcaster")
        if (farcasterProfile) {
          return NextResponse.json({
            basename: null,
            avatar: farcasterProfile.avatar || generateAvatarFromAddress(address),
          })
        }

        const firstWithAvatar = data.find((p: { avatar?: string }) => p.avatar)
        if (firstWithAvatar) {
          return NextResponse.json({
            basename: null,
            avatar: firstWithAvatar.avatar,
          })
        }
      }
    }

    return NextResponse.json({
      basename: null,
      avatar: generateAvatarFromAddress(address),
    })
  } catch (error) {
    console.error("Basename lookup error:", error)
    return NextResponse.json({
      basename: null,
      avatar: generateAvatarFromAddress(address),
    })
  }
}
