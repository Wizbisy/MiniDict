import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { MiniAppProvider } from "@/components/providers/miniapp-provider";
import { ModalProvider } from "@/components/providers/modal-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Minidict - Proof of Action Quests",
  description: "Complete Farcaster actions and earn USDC rewards on Base.",
  generator: "Minidict",
  openGraph: {
    title: "Minidict - Proof of Action Quests",
    description: "Complete Farcaster actions and earn USDC rewards on Base.",
    url: "https://minidict.app",
    siteName: "Minidict",
    images: [{
      url: "https://minidict.app/images/minidict-logo.png",
      width: 1200,
      height: 630,
      type: 'image/png',
    }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: "summary_large_image",
    site: '@minidict',
    creator: '@minidict',
    title: "Minidict - Proof of Action Quests",
    description: "Complete Farcaster actions and earn USDC rewards on Base.",
    images: ["https://minidict.app/images/minidict-logo.png"],
  },
  icons: {
    icon: [
      { url: '/images/minidict.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/images/minidict.png',
  },
  other: {
    "talentapp:project_verification": "5bb129b4ad6edd6b660e87d7d9b0e94fe3e0a3557d29283a8bf3dc49eb8f8dae8aa89920f9705276594579a997b5323448a6ef46b474cd07a9bda963f075ccb3",
    "wallet:safe": "true",
    "transaction:verification": "enabled",
    "base:app_id": "69518a0e4d3a403912ed8412",
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://minidict.app/images/minidict-logo.png",
      button: {
        title: "View Quests",
        action: {
          type: "launch_frame",
          name: "Minidict",
          url: "https://minidict.app",
          splashImageUrl: "https://minidict.app/images/minidict.png",
          splashBackgroundColor: "#0a0a14",
        },
      },
    }),
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased overflow-x-hidden`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <ModalProvider>
            <MiniAppProvider>{children}</MiniAppProvider>
          </ModalProvider>
        </ThemeProvider>
        <Analytics />
        <Toaster />
      </body>
    </html>
  );
}
