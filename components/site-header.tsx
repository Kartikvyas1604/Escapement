import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 md:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="flex items-baseline gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <span className="font-serif text-xl leading-none tracking-wide">
              ESCAPEMENT
            </span>
            <span className="h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-primary motion-safe:animate-pulse" />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-6 sm:flex">
            <Link
              href="/mint"
              className="text-sm text-muted-foreground transition-colors duration-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Buy lease
            </Link>
            <Link
              href="/lease"
              className="text-sm text-muted-foreground transition-colors duration-100 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Live lease
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 rounded-full border border-border px-2.5 py-1 font-mono text-xs tabular-nums text-muted-foreground sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden />
            Devnet
          </span>
          <div id="wallet-slot" />
        </div>
      </div>
    </header>
  );
}
