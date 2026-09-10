export type Cluster = "devnet" | "testnet" | "mainnet-beta" | "localnet";

function env(name: string): string | undefined {
  return typeof process !== "undefined" ? process.env[name] : undefined;
}

function num(name: string, fallback: number): number {
  const raw = env(name);
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) {
    console.warn(
      `escapement-client: ${name}="${raw}" is not a valid number — using default ${fallback}.`
    );
    return fallback;
  }
  return parsed;
}

function nums(name: string, fallback: readonly number[]): number[] {
  const raw = env(name);
  if (!raw) return [...fallback];
  const parsed = raw
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isFinite(v) && v > 0);
  if (parsed.length === 0) {
    console.warn(
      `escapement-client: ${name}="${raw}" is not a valid list — using defaults.`
    );
    return [...fallback];
  }
  return parsed;
}

const CLUSTER = (env("NEXT_PUBLIC_CLUSTER") ?? "devnet") as Cluster;

const RPC_URL =
  env("NEXT_PUBLIC_RPC_URL") ??
  (CLUSTER === "localnet"
    ? "http://127.0.0.1:8899"
    : `https://api.${CLUSTER}.solana.com`);

export const CONFIG = {
  cluster: CLUSTER,
  rpcUrl: RPC_URL,
  websocketUrl:
    env("NEXT_PUBLIC_WS_URL") ??
    RPC_URL.replace(/^http/, "ws"),
  explorerUrl: `https://explorer.solana.com/?cluster=${CLUSTER}`,
  programId: env("NEXT_PUBLIC_ESCAPEMENT_PROGRAM_ID") ?? "",
  templateProgramId: env("NEXT_PUBLIC_TEMPLATE_PROGRAM_ID") ?? "",
} as const;

/**
 * Lease economics and bounds. Overridable via env so operators can retune
 * without a code change; defaults match the MVP fee schedule.
 */
export const PRICING = {
  baseLamports: num("NEXT_PUBLIC_BASE_LAMPORTS", 5_000),
  perTickLamports: num("NEXT_PUBLIC_PER_TICK_LAMPORTS", 10_000),
  lamportsPerSOL: 1_000_000_000,
  intervalMinMs: num("NEXT_PUBLIC_INTERVAL_MIN_MS", 100),
  intervalMaxMs: num("NEXT_PUBLIC_INTERVAL_MAX_MS", 2000),
  iterationsMin: num("NEXT_PUBLIC_ITERATIONS_MIN", 1),
  iterationsMax: num("NEXT_PUBLIC_ITERATIONS_MAX", 100),
  presetsMs: nums("NEXT_PUBLIC_PRESETS_MS", [250, 500, 1000]),
} as const;

export function txExplorerUrl(txSig: string): string {
  return `https://explorer.solana.com/tx/${txSig}?cluster=${CONFIG.cluster === "mainnet-beta" ? "" : CONFIG.cluster}`;
}

export function addressExplorerUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=${CONFIG.cluster === "mainnet-beta" ? "" : CONFIG.cluster}`;
}
