import type React from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { MiniAppProvider } from "@/components/providers/miniapp-provider"
import { ModalProvider } from "@/components/providers/modal-provider"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Minidict",
  description: "Trade prediction markets with real-time data from Polymarket on Base",
  generator: "",
  openGraph: {
    title: "Minidict",
    description: "Trade prediction markets with real-time data from Polymarket",
    images: ["/images/minidict-logo.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Minidicts",
    description: "Trade prediction markets with real-time data from Polymarket",
    images: ["/images/minidict-logo.png"],
  },
  other: {
    'base:app_id': '69518a0e4d3a403912ed8412',
    "fc:miniapp": JSON.stringify({
      version: "next",
      imageUrl: "/images/minidict-logo.png",
      button: {
        title: "Trade Markets",
        action: {
          type: "launch_miniapp",
          name: "Minidict",
          url: "https://minidict.vercel.app",
          splashImageUrl: "/images/minidict-logo.png",
          splashBackgroundColor: "#0a0a14",
        },
      },
    }),
  },
}

export const viewport: Viewport = {
  themeColor: "#0a0a14",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body className="font-sans antialiased overflow-x-hidden">
        <ModalProvider>
          <MiniAppProvider>{children}</MiniAppProvider>
        </ModalProvider>
        <Analytics />
      </body>
    </html>
  )
}
