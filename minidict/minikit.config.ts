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
    subtitle: "Social prediction markets",
    description: "Predict post engagement on Farcaster. Bet on likes, recasts, and replies with USDC on Base.",
    screenshotUrls: [],
    primaryCategory: "social",
    tags: ["prediction-markets", "social", "engagement", "farcaster", "base"],
    heroImageUrl: LOGO,
    tagline: "Predict social engagement on Base",
    ogTitle: "Minidict - Social Prediction Markets",
    ogDescription: "Predict post engagement on Farcaster. Bet with USDC on Base.",
    ogImageUrl: LOGO,
    noindex: false,
  },
} as const;
