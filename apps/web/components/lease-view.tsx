"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Check, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusPill } from "@/components/ui/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import { useEscapement, settleFees, clearLease } from "@/lib/escapement/engine";
import { useWallet } from "@/lib/escapement/wallet-context";
import {
  formatLamports,
  formatClock,
  formatInterval,
  formatTime,
  truncateAddress,
  txExplorerUrl,
  PRICING,
} from "escapement-client";

export function LeaseView() {
  const {
    hydrated,
    lease,
    ticks,
    receipt,
    isSettling,
    error,
  } = useEscapement();
  const { publicKey } = useWallet();
  const [now, setNow] = useState<number | null>(null);

  const isLive = lease?.status === "Active";

  useEffect(() => {
    if (!isLive) return;
    const first = window.setTimeout(() => setNow(Date.now()), 0);
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [isLive]);

  if (!hydrated) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-7 w-24 rounded-full" />
        </div>
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    );
  }

  if (!lease) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
          <span
            className="flex h-12 w-12 items-center justify-center rounded-full border border-border font-mono text-lg text-muted-foreground"
            aria-hidden
          >
            ∅
          </span>
          <div className="space-y-1">
            <p className="text-sm font-medium">No lease yet</p>
            <p className="text-xs text-muted-foreground">
              Mint a lease and live ticks will stream here.
            </p>
          </div>
          <Link
            href="/mint"
            className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-[background-color] duration-100 hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            Buy an Escapement lease
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </CardContent>
      </Card>
    );
  }

  const remaining = Math.max(0, lease.iterations - lease.iterationsDone);
  const pct = Math.min(100, (lease.iterationsDone / lease.iterations) * 100);
  const canSettle =
    lease.iterationsDone > 0 &&
    (lease.status === "Active" || lease.status === "Exhausted");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <StatusPill status={lease.status} />
          <span className="font-mono text-xs tabular-nums text-muted-foreground">
            {truncateAddress(lease.id)} · counter-template
          </span>
        </div>
        <Button variant="ghost" className="min-h-10" onClick={clearLease}>
          Start a new lease
        </Button>
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-col gap-3 rounded-lg border border-destructive/20 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-sm text-destructive">{error}</p>
          <Button
            variant="secondary"
            className="min-h-10"
            onClick={() => void settleFees()}
          >
            Retry settle
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="py-10 md:py-14">
          <p className="text-center text-xs uppercase tracking-widest text-muted-foreground">
            Ticks fired
          </p>
          <p
            className="mt-3 text-center font-mono text-7xl font-semibold tabular-nums md:text-8xl"
            aria-live="polite"
            aria-label={`${lease.iterationsDone} of ${lease.iterations} ticks fired`}
          >
            <span key={lease.iterationsDone} className="tick-flash inline-block">
              {lease.iterationsDone}
            </span>
            <span className="ml-2 align-middle font-mono text-2xl text-muted-foreground md:text-3xl">
              / {lease.iterations}
            </span>
          </p>
          <div
            className="mx-auto mt-8 h-1.5 w-full max-w-md overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={lease.iterationsDone}
            aria-valuemin={0}
            aria-valuemax={lease.iterations}
          >
            <div
              className="h-full rounded-full bg-primary motion-safe:transition-[width] motion-safe:duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card p-4 md:p-6">
          <dt className="text-xs text-muted-foreground">Cadence</dt>
          <dd className="mt-1 font-mono text-lg tabular-nums">
            {formatInterval(lease.intervalMs)}
          </dd>
        </div>
        <div className="bg-card p-4 md:p-6">
          <dt className="text-xs text-muted-foreground">Remaining ticks</dt>
          <dd className="mt-1 font-mono text-lg tabular-nums">{remaining}</dd>
        </div>
        <div className="bg-card p-4 md:p-6">
          <dt className="text-xs text-muted-foreground">Expires in</dt>
          <dd className="mt-1 font-mono text-lg tabular-nums">
            {now === null ? "—" : formatClock(lease.expiresAt - now)}
          </dd>
        </div>
        <div className="bg-card p-4 md:p-6">
          <dt className="text-xs text-muted-foreground">Buyer</dt>
          <dd className="mt-1 font-mono text-sm tabular-nums">
            {publicKey ? truncateAddress(publicKey) : truncateAddress(lease.buyer)}
          </dd>
        </div>
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tick feed</CardTitle>
            <CardDescription>Last {ticks.length || 10} fires, newest first</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {ticks.length === 0 ? (
              <div className="flex flex-col items-center gap-1 px-4 py-12 text-center md:px-6">
                <p className="text-sm font-medium">Waiting for the first tick</p>
                <p className="text-xs text-muted-foreground">
                  The crank fires every {formatInterval(lease.intervalMs)} while
                  the lease is active.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {ticks.map((tick) => (
                  <li
                    key={`${tick.seq}-${tick.at}`}
                    className="tick-in flex items-center justify-between gap-3 px-4 py-2.5 md:px-6"
                  >
                    <span className="flex items-center gap-2 font-mono text-sm tabular-nums">
                      {tick.success ? (
                        <Check className="h-3.5 w-3.5 text-success" aria-label="Tick succeeded" />
                      ) : (
                        <X className="h-3.5 w-3.5 text-destructive" aria-label={`Tick failed with code ${tick.errorCode}`} />
                      )}
                      <span className="text-muted-foreground">#</span>
                      {tick.seq}
                    </span>
                    <span className="font-mono text-xs tabular-nums text-muted-foreground">
                      {formatTime(tick.at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Settle fees</CardTitle>
            <CardDescription>Magic Action commit to Solana L1</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">Prepaid</dt>
                <dd className="font-mono tabular-nums">
                  {formatLamports(lease.feePrepaidLamports)} SOL
                </dd>
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <dt className="text-muted-foreground">
                  Executed ({lease.iterationsDone} ticks)
                </dt>
                <dd className="font-mono tabular-nums">
                  {formatLamports(lease.iterationsDone * PRICING.perTickLamports)} SOL
                </dd>
              </div>
            </dl>

            {receipt ? (
              <div className="space-y-3 rounded-md border border-success/30 bg-success/5 p-4">
                <p className="flex items-center gap-2 text-sm text-success">
                  <Check className="h-4 w-4" aria-hidden />
                  Settled {formatLamports(receipt.amountLamports)} SOL
                </p>
                <a
                  href={txExplorerUrl(receipt.txSig)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-10 items-center gap-1.5 text-sm text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {truncateAddress(receipt.txSig, 8)}
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  <span className="sr-only">(opens Solana Explorer in a new tab)</span>
                </a>
                <p className="text-xs text-muted-foreground">
                  Committed {formatTime(receipt.committedAt)} on devnet.
                </p>
              </div>
            ) : canSettle ? (
              <Button
                className="w-full min-h-12"
                loading={isSettling || lease.status === "Settling"}
                onClick={() => void settleFees()}
              >
                Settle via Magic Action
              </Button>
            ) : lease.status === "Settled" ? null : (
              <p className="text-xs text-muted-foreground">
                Settle unlocks after the first tick commits.
              </p>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              Only executed ticks are billed. Unused lease time expires — it is
              never rolled into a standing cron.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
