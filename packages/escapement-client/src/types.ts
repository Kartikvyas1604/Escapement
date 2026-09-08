import type { OnChainLeaseStatus } from "./program.js";

/** UI lease status — mirrors on-chain statuses plus the transient settle state. */
export type LeaseStatus = OnChainLeaseStatus | "Settling";

/**
 * Local mirror of the on-chain Escapement lease account. The source of truth
 * is the lease PDA on devnet; this record is hydrated from the chain.
 */
export interface EscapementLease {
  /** Lease PDA (base58) — the real on-chain account. */
  leasePda: string;
  /** Buyer wallet that minted the lease. */
  buyer: string;
  /** Buyer's lease index used in the PDA derivation. */
  index: number;
  /** Program template being cranked. */
  templateId: string;
  registeredProgram: string;
  intervalMs: number;
  iterations: number;
  iterationsDone: number;
  feePrepaidLamports: number;
  feeSettledLamports: number;
  status: LeaseStatus;
  createdAt: number;
  expiresAt: number;
  /** Signature of the mint_lease transaction. */
  mintTxSig: string;
}

export interface TickReceipt {
  leasePda: string;
  seq: number;
  success: boolean;
  at: number;
  /** Signature of the crank transaction, when the crank returned one. */
  txSig?: string;
}

export interface FeeSettleReceipt {
  leasePda: string;
  amountLamports: number;
  txSig: string;
  committedAt: number;
}
