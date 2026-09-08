import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CrankRunner } from "@/lib/escapement/crank-runner";
import { WalletProvider } from "@/lib/escapement/wallet-context";

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
  title: "Escapement — Live Keeper Exchange",
  description:
    "Buy an Escapement lease: time-bounded MagicBlock crank bandwidth for your program, with live gasless ticks and Solana fee settlement.",
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
        <WalletProvider>
          <CrankRunner />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </WalletProvider>
      </body>
    </html>
  );
}
