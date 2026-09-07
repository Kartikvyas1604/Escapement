export const PRICING = {
  baseLamports: 5_000,
  perTickLamports: 10_000,
  lamportsPerSOL: 1_000_000_000,
} as const;

export function quoteLeaseLamports(iterations: number): number {
  return PRICING.baseLamports + iterations * PRICING.perTickLamports;
}

export function formatLamports(lamports: number, decimals = 4): string {
  return (lamports / PRICING.lamportsPerSOL).toFixed(decimals);
}
