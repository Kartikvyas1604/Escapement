"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Copy, ExternalLink, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/lib/escapement/wallet-context";
import { truncateAddress, addressExplorerUrl } from "escapement-client";

export function WalletButton() {
  const { state, publicKey, walletName, wallets, error, connect, disconnect } =
    useWallet();
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
        return;
      }
      // Roving focus through the menu with arrow keys / Home / End.
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Home" || e.key === "End") {
        const items = Array.from(
          rootRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []
        );
        if (items.length === 0) return;
        e.preventDefault();
        const activeIndex = items.indexOf(document.activeElement as HTMLElement);
        let nextIndex: number;
        if (e.key === "Home") nextIndex = 0;
        else if (e.key === "End") nextIndex = items.length - 1;
        else if (e.key === "ArrowDown") nextIndex = (activeIndex + 1) % items.length;
        else nextIndex = activeIndex <= 0 ? items.length - 1 : activeIndex - 1;
        items[nextIndex]?.focus();
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

  // Move focus to the first menu item when the menu opens.
  useEffect(() => {
    if (!open) return;
    const first = rootRef.current?.querySelector<HTMLElement>('[role="menuitem"]');
    first?.focus();
  }, [open]);

  if (state !== "connected" || !publicKey) {
    return (
      <div ref={rootRef} className="relative">
        <Button
          ref={triggerRef}
          className="min-h-10 px-4"
          variant="secondary"
          aria-haspopup={wallets.length > 0 ? "menu" : undefined}
          aria-expanded={open}
          loading={state === "connecting"}
          onClick={() => {
            if (wallets.length > 0) {
              setOpen((v) => !v);
            } else {
              window.open("https://phantom.app/download", "_blank");
            }
          }}
        >
          {state === "connecting" ? "Connecting..." : "Connect wallet"}
        </Button>
        {error && state !== "connecting" && (
          <p
            role="alert"
            className="absolute right-0 top-full z-50 mt-2 w-56 rounded-md border border-destructive/30 bg-popover px-3 py-2 text-xs text-destructive"
          >
            {error}
          </p>
        )}
        {open && wallets.length > 0 && (
          <div
            role="menu"
            aria-label="Choose a wallet"
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
          >
            {wallets.map((wallet) => (
              <button
                key={wallet.name}
                role="menuitem"
                type="button"
                onClick={() => {
                  setOpen(false);
                  void connect(wallet);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
              >
                {wallet.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  async function copyAddress() {
    try {
      await navigator.clipboard.writeText(publicKey ?? "");
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
    window.setTimeout(() => setCopyState("idle"), 1500);
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
          {walletName && (
            <p className="px-4 pt-2.5 pb-1 text-xs text-muted-foreground">
              Connected via {walletName}
            </p>
          )}
            <button
              role="menuitem"
              type="button"
              onClick={() => void copyAddress()}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors duration-100 hover:bg-muted focus-visible:outline-none focus-visible:bg-muted"
            >
              {copyState === "copied" ? (
                <Check className="h-4 w-4 text-success" aria-hidden />
              ) : (
                <Copy className="h-4 w-4 text-muted-foreground" aria-hidden />
              )}
              {copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                  ? "Copy failed — select the address"
                  : "Copy address"}
            </button>
          <a
            role="menuitem"
            href={addressExplorerUrl(publicKey)}
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
              void disconnect();
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
