import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { MiniAppProvider } from "@/components/providers/miniapp-provider";
import { ModalProvider } from "@/components/providers/modal-provider";
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
  title: "Minidict - powerd by polymarket",
  description: "Trade prediction markets with real-time data from Polymarket on Base",
  generator: "Minidict",
  openGraph: {
    title: "Minidict - powered by polymarket",
    description: "Trade prediction markets with real-time data from Polymarket",
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
    title: "Minidict - powered by polymarket",
    description: "Trade prediction markets with real-time data from Polymarket",
    images: ["https://minidict.app/images/minidict-logo.png"],
  },
  icons: {
    icon: [
      { url: '/images/minidict.png', type: 'image/png', sizes: '32x32' },
    ],
    apple: '/images/minidict.png',
  },
  other: {
    "wallet:safe": "true",
    "transaction:verification": "enabled",
    "base:app_id": "69518a0e4d3a403912ed8412",
    "fc:frame": JSON.stringify({
      version: "next",
      imageUrl: "https://minidict.app/images/minidict-logo.png",
      button: {
        title: "Trade Markets",
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
    <html lang="en" className="dark">
      {/* 4. Injected font variables into the body so 'font-sans' works */}
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased overflow-x-hidden`}>
        <ModalProvider>
          <MiniAppProvider>{children}</MiniAppProvider>
        </ModalProvider>
        <Analytics />
      </body>
    </html>
  );
}
