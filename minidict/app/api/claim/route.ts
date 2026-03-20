import { type NextRequest, NextResponse } from "next/server"
import { privateKeyToAccount } from "viem/accounts"
import { CONTRACTS } from "@/lib/contract-abi"
import { getUserNonce, hasUserClaimed, getQuest } from "@/lib/contracts"
import { getFidFromAddress, getAddressesForFid, verifyAction, getUserProfile } from "@/lib/farcaster"
import { decodeActionMask } from "@/lib/types"

const DOMAIN = {
  name: "MiniDictQuests",
  version: "1",
  chainId: 8453,
  verifyingContract: CONTRACTS.QUEST_ROUTER as `0x${string}`,
} as const

const CLAIM_TYPES = {
  ClaimReward: [
    { name: "questId", type: "uint256" },
    { name: "user", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "sigDeadline", type: "uint256" },
  ],
} as const

export async function POST(request: NextRequest) {
  try {
    const { questId, userAddress, fid } = await request.json()

    if (questId === undefined || !userAddress) {
      return NextResponse.json(
        { error: "Missing questId or wallet address" },
        { status: 400 }
      )
    }

    const signerKey = process.env.SIGNER_PRIVATE_KEY
    if (!signerKey) {
      console.error("SIGNER_PRIVATE_KEY not configured")
      return NextResponse.json(
        { error: "Server configuration error — contact support" },
        { status: 500 }
      )
    }

    const quest = await getQuest(questId)
    if (!quest) {
      return NextResponse.json(
        { error: "Quest not found" },
        { status: 404 }
      )
    }

    if (quest.creator.toLowerCase() === userAddress.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot claim rewards from your own quest" },
        { status: 400 }
      )
    }

    if (!quest.isActive) {
      return NextResponse.json(
        { error: "This quest has been deactivated" },
        { status: 400 }
      )
    }

    const now = Math.floor(Date.now() / 1000)
    if (now >= quest.deadline) {
      return NextResponse.json(
        { error: "This quest has expired" },
        { status: 400 }
      )
    }

    if (quest.claimCount >= quest.maxClaims) {
      return NextResponse.json(
        { error: "All rewards for this quest have been claimed" },
        { status: 400 }
      )
    }

    const userFid = fid ? parseInt(fid) : await getFidFromAddress(userAddress)
    if (!userFid) {
      return NextResponse.json(
        { error: "Could not find your Farcaster account — make sure your wallet is connected to Farcaster" },
        { status: 400 }
      )
    }

    if (quest.minFollowers > 0 || quest.requirePowerBadge) {
      const profile = await getUserProfile(userFid)
      if (!profile) {
        return NextResponse.json(
          { error: "Failed to load Farcaster profile for requirements check" },
          { status: 400 }
        )
      }
      if (quest.minFollowers > 0 && profile.followerCount < quest.minFollowers) {
        return NextResponse.json(
          { error: `This quest requires at least ${quest.minFollowers} followers` },
          { status: 403 }
        )
      }
      if (quest.requirePowerBadge && !profile.powerBadge) {
        return NextResponse.json(
          { error: "This quest requires a Farcaster Power Badge (Verified)" },
          { status: 403 }
        )
      }
    }

    const linkedAddresses = await getAddressesForFid(userFid)
    for (const addr of linkedAddresses) {
      const claimed = await hasUserClaimed(questId, addr)
      if (claimed) {
        return NextResponse.json(
          { error: "You have already claimed this quest reward (from a linked wallet)" },
          { status: 400 }
        )
      }
    }

    const alreadyClaimed = await hasUserClaimed(questId, userAddress)
    if (alreadyClaimed) {
      return NextResponse.json(
        { error: "You have already claimed this quest reward" },
        { status: 400 }
      )
    }

    const actions = decodeActionMask(quest.actionMask)
    for (const action of actions) {
      const verification = await verifyAction(action, quest.targetIdentifier, userFid)
      if (!verification.verified) {
        return NextResponse.json(
          { error: verification.reason },
          { status: 400 }
        )
      }
    }

    const nonce = await getUserNonce(userAddress)
    const sigDeadline = Math.floor(Date.now() / 1000) + 3600
    const account = privateKeyToAccount(signerKey as `0x${string}`)
    const signature = await account.signTypedData({
      domain: DOMAIN,
      types: CLAIM_TYPES,
      primaryType: "ClaimReward",
      message: {
        questId: BigInt(questId),
        user: userAddress as `0x${string}`,
        nonce: BigInt(nonce),
        sigDeadline: BigInt(sigDeadline),
      },
    })

    return NextResponse.json({
      signature,
      nonce,
      sigDeadline,
      questId,
      userAddress,
    })
  } catch (error) {
    console.error("Claim API error:", error)
    return NextResponse.json(
      { error: "Something went wrong — please try again" },
      { status: 500 }
    )
  }
}
