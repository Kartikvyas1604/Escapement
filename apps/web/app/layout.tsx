import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CrankRunner } from "@/lib/escapement/crank-runner";
import { WalletProvider } from "@/lib/escapement/wallet-context";
import { SITE_URL } from "@/lib/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: {
    default: "Escapement — Live Keeper Exchange",
    template: "%s — Escapement",
  },
  description:
    "Buy an Escapement lease: time-bounded MagicBlock crank bandwidth for your program, with live gasless ticks and Solana fee settlement.",
  metadataBase: new URL(SITE_URL),
  alternates: { canonical: "/" },
  openGraph: {
    title: "Escapement — Live Keeper Exchange",
    description:
      "Lease crank bandwidth for your program. Buy an Escapement lease, watch ticks fire live, settle fees on Solana.",
    url: "/",
    siteName: "Escapement",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Escapement — Live Keeper Exchange",
    description:
      "Lease crank bandwidth for your program on MagicBlock Ephemeral Rollups.",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <WalletProvider>
          <CrankRunner />
          <SiteHeader />
          <main id="main-content" className="flex-1">{children}</main>
          <SiteFooter />
          <Analytics />
        </WalletProvider>
      </body>
    </html>
  );
}
