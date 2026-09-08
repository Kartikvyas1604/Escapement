"use client";

import { useEffect, useState } from "react";
import { Connection } from "@solana/web3.js";
import {
  CONFIG,
  ESCAPEMENT_PROGRAM_ID,
  TEMPLATE_PROGRAM_ID,
  decodeMarket,
  marketPda,
  PRICING,
} from "escapement-client";

/**
 * Live on-chain stats strip. Reads the deployed programs directly from the
 * configured RPC: the fee schedule from the market account, the number of
 * leases minted (Lease accounts are 162 bytes), and the total ticks cranked
 * (Counter accounts are 48 bytes; the count is the u64 at offset 40).
 *
 * Falls back to the env-configured fee schedule when the RPC is unreachable.
 */

const LEASE_ACCOUNT_SIZE = 8 + 154; // discriminator + Lease::INIT_SPACE
const COUNTER_ACCOUNT_SIZE = 8 + 32 + 8; // discriminator + lease pubkey + count

interface LiveStats {
  feePerTickLamports: number | null;
  leases: number | null;
  ticks: number | null;
}

function formatSol(lamports: number): string {
  return `${(lamports / 1_000_000_000).toFixed(5)} SOL`;
}

function formatCount(n: number): string {
  return n.toLocaleString("en-US");
}

export function LiveStats() {
  const [stats, setStats] = useState<LiveStats>({
    feePerTickLamports: null,
    leases: null,
    ticks: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const next: LiveStats = {
        feePerTickLamports: null,
        leases: null,
        ticks: null,
      };
      try {
        const connection = new Connection(CONFIG.rpcUrl, "confirmed");

        const marketInfo = await connection.getAccountInfo(marketPda());
        if (marketInfo) {
          next.feePerTickLamports = decodeMarket(new Uint8Array(marketInfo.data)).feePerTick;
        }

        const [leaseAccounts, counterAccounts] = await Promise.all([
          connection.getProgramAccounts(ESCAPEMENT_PROGRAM_ID, {
            filters: [{ dataSize: LEASE_ACCOUNT_SIZE }],
            encoding: "base64",
            dataSlice: { offset: 0, length: 0 },
          }),
          connection.getProgramAccounts(TEMPLATE_PROGRAM_ID, {
            filters: [{ dataSize: COUNTER_ACCOUNT_SIZE }],
            encoding: "base64",
          }),
        ]);

        next.leases = leaseAccounts.length;
        next.ticks = counterAccounts.reduce((sum, { account }) => {
          const count = new DataView(
            account.data.buffer,
            account.data.byteOffset
          ).getBigUint64(40, true);
          return sum + Number(count);
        }, 0);
      } catch {
        // RPC hiccup — keep whatever we resolved, show dashes for the rest.
      }
      if (!cancelled) setStats(next);
    }

    void load();
    const id = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const cards = [
    {
      value: stats.feePerTickLamports === null
        ? formatSol(PRICING.perTickLamports)
        : formatSol(stats.feePerTickLamports),
      label: "Fee per tick · read from the market account",
    },
    {
      value: stats.leases === null ? "—" : formatCount(stats.leases),
      label: "Lease PDAs minted on devnet",
    },
    {
      value: stats.ticks === null ? "—" : formatCount(stats.ticks),
      label: "Ticks cranked on-chain",
    },
  ];

  return (
    <div className="w-full">
      <dl className="grid w-full grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-3">
        {cards.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col bg-card px-4 py-5 md:px-6"
          >
            <dt className="order-2 text-xs text-muted-foreground">
              {stat.label}
            </dt>
            <dd className="order-1 mb-1 font-mono text-2xl font-semibold tabular-nums">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 font-mono text-xs tabular-nums text-muted-foreground">
        0 wallet signatures per tick · 1 transaction to settle fees on Solana
      </p>
    </div>
  );
}
