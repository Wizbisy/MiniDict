const URL = process.env.PUBLIC_URL;
const ICON = `${URL}/images/minidict.png`;
const LOGO = `${URL}/images/minidict-logo.png`;

export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjEwNDExMzIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg5ODQyN2Q1M0MwYjA2MDk1OGQ0MWRhYTI1ZTI0MTcyOGE4ZTMwOWFkIn0",
    payload: "eyJkb21haW4iOiJ0ZXN0bmV0Lm1pbmlkaWN0LmFwcCJ9",
    signature: "Qp1MVTDhk1xsDdeqLZPsz5V6B8zjQZuMzGJ5uVKRFvJHKXpaVOaP83ghxd0JoEM0RJPozgMHOaaeMctIfETgZRw="
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
    tags: ["quests", "rewards", "farcaster", "base", "usdc"],
    heroImageUrl: LOGO,
    tagline: "Complete quests, earn USDC",
    ogTitle: "Minidict Quests",
    ogDescription: "Complete Farcaster actions and earn USDC rewards on Base.",
    ogImageUrl: LOGO,
    noindex: false,
  },
} as const;
