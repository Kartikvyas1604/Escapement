const LAST_PORTAL_CHECK = "2026-09-07 18:00 SGT";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto w-full max-w-7xl space-y-3 px-4 py-8 md:px-6 lg:px-8">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Solana Blitz v8 × MagicBlock build. Submit portal status re-checked{" "}
          <time className="font-mono tabular-nums">{LAST_PORTAL_CHECK}</time> —
          if the portal shows closed, this demo follows the Forge path.
        </p>
        <p className="text-xs text-muted-foreground">
          Unused leases expire. Escapement sells execution rights — not a
          tutorial.
        </p>
      </div>
    </footer>
  );
}
