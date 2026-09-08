export type LeaseStatus = "Active" | "Exhausted" | "Settling" | "Settled" | "Expired";

export interface EscapementProgram {
  address: string;
  name: string;
  template: "counter";
  status: "Active" | "Paused";
}

export interface EscapementLease {
  id: string;
  buyer: string;
  program: string;
  intervalMs: number;
  iterations: number;
  iterationsDone: number;
  feePrepaidLamports: number;
  feeSettledLamports: number;
  status: LeaseStatus;
  createdAt: number;
  expiresAt: number;
}

export interface TickReceipt {
  leaseId: string;
  seq: number;
  success: boolean;
  at: number;
  errorCode?: number;
}

export interface FeeSettleReceipt {
  leaseId: string;
  amountLamports: number;
  txSig: string;
  committedAt: number;
}
