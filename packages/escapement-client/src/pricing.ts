import { PRICING } from "./config";

export function quoteLeaseLamports(iterations: number): number {
  return PRICING.baseLamports + iterations * PRICING.perTickLamports;
}

export function formatLamports(lamports: number, decimals = 4): string {
  return (lamports / PRICING.lamportsPerSOL).toFixed(decimals);
}
