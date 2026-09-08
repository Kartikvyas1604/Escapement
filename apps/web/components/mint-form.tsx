"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Field } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useWallet } from "@/lib/escapement/wallet-context";
import { useEscapement, mintLease, fetchMarket } from "@/lib/escapement/engine";
import { useEffect } from "react";
import { formatInterval, formatLamports, PRICING } from "escapement-client";

const PRESETS = PRICING.presetsMs;
const INTERVAL_MIN = PRICING.intervalMinMs;
const INTERVAL_MAX = PRICING.intervalMaxMs;
const ITERATIONS_MIN = PRICING.iterationsMin;
const ITERATIONS_MAX = PRICING.iterationsMax;

type Errors = { interval?: string; iterations?: string };

function validate(intervalRaw: string, iterationsRaw: string): Errors {
  const errors: Errors = {};
  const interval = Number(intervalRaw);
  const iterations = Number(iterationsRaw);
  if (!Number.isInteger(interval) || interval < INTERVAL_MIN || interval > INTERVAL_MAX) {
    errors.interval = `Tick cadence must be a whole number between ${INTERVAL_MIN} and ${INTERVAL_MAX} ms`;
  }
  if (!Number.isInteger(iterations) || iterations < ITERATIONS_MIN || iterations > ITERATIONS_MAX) {
    errors.iterations = `Iterations must be a whole number between ${ITERATIONS_MIN} and ${ITERATIONS_MAX}`;
  }
  return errors;
}

export function MintForm() {
  const router = useRouter();
  const { state, publicKey, error: walletError, connect } = useWallet();
  const { isMinting, error, lease, market } = useEscapement();

  useEffect(() => {
    if (!market) void fetchMarket();
  }, [market]);

  // Fee schedule is read from the on-chain market config when available.
  const baseLamports = market?.feeBase ?? PRICING.baseLamports;
  const perTickLamports = market?.feePerTick ?? PRICING.perTickLamports;

  const [intervalRaw, setIntervalRaw] = useState("500");
  const [iterationsRaw, setIterationsRaw] = useState("20");
  const [touched, setTouched] = useState<{ interval?: boolean; iterations?: boolean }>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  const errors = useMemo(
    () => validate(intervalRaw, iterationsRaw),
    [intervalRaw, iterationsRaw]
  );

  const iterations = Number.isInteger(Number(iterationsRaw)) ? Number(iterationsRaw) : 0;
  const quoted =
    iterations >= ITERATIONS_MIN ? baseLamports + perTickLamports * iterations : null;

  const showIntervalError = submitAttempted || touched.interval ? errors.interval : undefined;
  const showIterationsError =
    submitAttempted || touched.iterations ? errors.iterations : undefined;
  const formValid = Object.keys(errors).length === 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitAttempted(true);
    if (!formValid) {
      const firstInvalid = errors.interval
        ? "interval"
        : errors.iterations
          ? "iterations"
          : null;
      if (firstInvalid) {
        document.getElementById(firstInvalid)?.focus();
      }
      return;
    }
    if (state !== "connected" || !publicKey) return;
    const ok = await mintLease({
      intervalMs: Number(intervalRaw),
      iterations: Number(iterationsRaw),
    });
    if (ok) router.push("/lease");
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {lease && (lease.status === "Active" || lease.status === "Exhausted") && (
        <Link
          href="/lease"
          className="flex min-h-10 items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-4 py-2 text-sm text-primary transition-colors duration-100 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:col-span-2"
        >
          A lease is already running — watch it live
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      )}
      <Card>
        <CardContent>
          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            <fieldset className="space-y-1.5">
              <legend className="pb-1.5 text-sm font-medium">Program</legend>
              <div className="flex h-10 items-center justify-between rounded-md border border-input bg-muted px-3">
                <span className="font-mono text-sm">counter-template</span>
                <span className="font-mono text-xs text-muted-foreground">
                  bump u64 / tick
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                One registered template in MVP. More templates come later.
              </p>
            </fieldset>

            <div className="space-y-1.5">
              <Field
                id="interval"
                label="Tick cadence (ms)"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                spellCheck={false}
                value={intervalRaw}
                onChange={(e) => setIntervalRaw(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => setTouched((t) => ({ ...t, interval: true }))}
                error={showIntervalError}
                hint={`How often the crank fires. Presets: ${PRESETS.map((p) => formatInterval(p)).join(", ")}`}
                placeholder="500"
                aria-required="true"
              />
              <div className="flex gap-2" role="group" aria-label="Cadence presets">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    aria-pressed={intervalRaw === String(p)}
                    onClick={() => {
                      setIntervalRaw(String(p));
                      setTouched((t) => ({ ...t, interval: true }));
                    }}
                    className="min-h-10 rounded-md border border-border px-3 font-mono text-xs tabular-nums text-muted-foreground transition-colors duration-100 hover:border-primary/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background aria-pressed:border-primary/60 aria-pressed:bg-primary/10 aria-pressed:text-primary"
                  >
                    {formatInterval(p)}
                  </button>
                ))}
              </div>
            </div>

            <Field
              id="iterations"
              label="Iterations"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              spellCheck={false}
              value={iterationsRaw}
              onChange={(e) => setIterationsRaw(e.target.value.replace(/[^0-9]/g, ""))}
              onBlur={() => setTouched((t) => ({ ...t, iterations: true }))}
              error={showIterationsError}
              hint="Total ticks the lease is entitled to. Unused iterations expire — a lease is not an unlimited cron."
              placeholder="20"
              aria-required="true"
            />

            {error && (
              <p role="alert" className="text-xs text-destructive">
                {error}
              </p>
            )}

            {state !== "connected" ? (
              <div className="space-y-2">
                <Button
                  type="button"
                  className="w-full min-h-12"
                  onClick={() => void connect()}
                  loading={state === "connecting"}
                >
                  Connect wallet to continue
                </Button>
                <p className="text-xs text-muted-foreground">
                  A session key attaches to the lease so ticks fire without
                  wallet signatures.
                </p>
                {walletError && (
                  <p role="alert" className="text-xs text-destructive">
                    {walletError}
                  </p>
                )}
              </div>
            ) : (
              <Button type="submit" className="w-full min-h-12" loading={isMinting} disabled={!formValid}>
                Sign &amp; mint lease
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card aria-live="polite">
        <CardHeader>
          <CardTitle>Fee preview</CardTitle>
          <CardDescription>Prepaid, settled after commit</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {quoted ? (
            <>
              <dl className="space-y-2 text-sm">
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">Base</dt>
                  <dd className="font-mono tabular-nums">
                    {formatLamports(baseLamports)} SOL
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <dt className="text-muted-foreground">
                    {iterations} × {formatLamports(perTickLamports)} / tick
                  </dt>
                  <dd className="font-mono tabular-nums">
                    {formatLamports(perTickLamports * iterations)} SOL
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-2 border-t border-border pt-2">
                  <dt className="font-medium">Total prepaid</dt>
                  <dd className="font-mono text-lg font-semibold tabular-nums">
                    {formatLamports(quoted)} SOL
                  </dd>
                </div>
              </dl>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Settles to Solana via Magic Action after the lease runs. Only
                executed ticks are billed.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Enter a valid iteration count to quote the lease.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
