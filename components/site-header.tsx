"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { WalletButton } from "@/components/wallet-button";

const links = [
  { href: "/mint", label: "Buy lease" },
  { href: "/lease", label: "Live lease" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-6 md:gap-8">
          <Link
            href="/"
            className="flex items-baseline gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="font-serif text-xl leading-none tracking-wide">
              ESCAPEMENT
            </span>
            <span className="h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-primary motion-safe:animate-pulse" />
          </Link>
          <nav aria-label="Main" className="flex items-center gap-4 md:gap-6">
            {links.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`text-sm transition-colors duration-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-xs tabular-nums text-muted-foreground md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            Devnet
          </span>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
