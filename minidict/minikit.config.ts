const URL = process.env.PUBLIC_URL;
const ICON = `${URL}/images/minidict.png`;
const LOGO = `${URL}/images/minidict-logo.png`;

export const minikitConfig = {
  accountAssociation: {
    header: "eyJmaWQiOjEwNDExMzIsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHg5ODQyN2Q1M0MwYjA2MDk1OGQ0MWRhYTI1ZTI0MTcyOGE4ZTMwOWFkIn0",
    payload: "eyJkb21haW4iOiJ3d3cubWluaWRpY3QuYXBwIn0",
    signature: "5KbJKjIm81eMI23tcpL63nKXGk7s2KG4eEfamgSJ0M9jdJm8Dhst1Bd8ONkgwuVEEsYsSQR4B2rYG28PB1LC+hw="
  },
  webhookUrl: `${URL}/api/webhook`,
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
    screenshotUrls: [
      `${URL}/images/Screenshot1.png`,
      `${URL}/images/Screenshot2.png`,
      `${URL}/images/Screenshot3.png`
    ],
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
