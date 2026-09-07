"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/escapement/wallet-context";
import { truncateAddress } from "@/lib/escapement/format";

export function WalletButton() {
  const { state, publicKey, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (state !== "connected" || !publicKey) {
    return (
      <Button
        className="min-h-10 px-4"
        variant="secondary"
        loading={state === "connecting"}
        onClick={() => void connect()}
      >
        {state === "connecting" ? "Connecting..." : "Connect wallet"}
      </Button>
    );
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(publicKey ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-secondary px-3 font-mono text-sm tabular-nums text-secondary-foreground transition-colors duration-100 hover:bg-popover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"      >
        <span className="h-2 w-2 rounded-full bg-success" aria-hidden />
        {truncateAddress(publicKey)}
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground motion-safe:transition-transform motion-safe:duration-100 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Wallet menu"
          className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
        >
          <button
            role="menuitem"
            type="button"
            onClick={() => void copyAddress()}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
          >
            {copied ? (
              <Check className="h-4 w-4 text-success" aria-hidden />
            ) : (
              <Copy className="h-4 w-4 text-muted-foreground" aria-hidden />
            )}
            {copied ? "Copied" : "Copy address"}
          </button>
          <a
            role="menuitem"
            href={`https://explorer.solana.com/address/${publicKey}?cluster=devnet`}
            target="_blank"
            rel="noreferrer"
            onClick={() => setOpen(false)}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
          >
            <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden />
            View on explorer
          </a>
          <div className="border-t border-border" />
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setOpen(false);
              disconnect();
            }}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-destructive transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
          >
            <LogOut className="h-4 w-4" aria-hidden />
            Disconnect
          </button>
        </div>
      )}
    </div>
  );
}
