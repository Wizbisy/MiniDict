const URL = process.env.PUBLIC_URL;
const ICON = `${URL}/images/minidict.png`;
const LOGO = `${URL}/images/minidict-logo.png`;

export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjEwNDExMzIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg5ODQyN2Q1M0MwYjA2MDk1OGQ0MWRhYTI1ZTI0MTcyOGE4ZTMwOWFkIn0",
    payload: "eyJkb21haW4iOiJtaW5pZGljdC5hcHAifQ",
    signature: "Nvy2a6cY8VHVXQu2OEMnRm6WhSimOKO36+VysaEbQxZmlYV2BztYNQPM3ZrpBzNO8RuoKUbnhn6a9yZRFzQ/cBw="
  },
  miniapp: {
    version: "1",
    name: "Minidict",
    homeUrl: URL,
    iconUrl: ICON,
    splashImageUrl: ICON,
    splashBackgroundColor: "#0a0a14",
    webhookUrl: `${URL}/api/webhook`,
    subtitle: "Proof of Action Quests",
    description: "Complete Farcaster actions and earn USDC rewards on Base. Like, recast, follow, and more to claim your bounty.",
    screenshotUrls: [],
    primaryCategory: "social",
    tags: ["quests", "rewards", "social", "farcaster", "base", "usdc"],
    heroImageUrl: LOGO,
    tagline: "Complete quests, earn USDC on Base",
    ogTitle: "Minidict - Proof of Action Quests",
    ogDescription: "Complete Farcaster actions and earn USDC rewards on Base.",
    ogImageUrl: LOGO,
    noindex: false,
  },
} as const;
