// Test helpers: borsh test encoding for lease accounts.
import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import {
  u64ToBytes,
  u32ToBytes,
  concatBytes,
  LEASE_DISCRIMINATOR,
  MARKET_DISCRIMINATOR,
  BUYER_STATE_DISCRIMINATOR,
  REGISTERED_PROGRAM_DISCRIMINATOR,
} from "../src/program.js";

export { ixNameDiscriminator, LEASE_DISCRIMINATOR } from "../src/program.js";
export { sha256 } from "../src/program.js";
export const sha256Local = (data: Uint8Array) => createHash("sha256").update(data).digest();

export const MARKET_DISC = MARKET_DISCRIMINATOR;
export const BUYER_STATE_DISC = BUYER_STATE_DISCRIMINATOR;
export const REGISTERED_PROGRAM_DISC = REGISTERED_PROGRAM_DISCRIMINATOR;

interface TestLease {
  buyer: string;
  registeredProgram: string;
  templateId: string;
  intervalMs: number;
  iterations: number;
  iterationsDone: number;
  feePrepaid: number;
  feeSettled: number;
  status: number;
  createdAt: number;
  expiresAt: number;
  lastTickAt: number;
  bump: number;
}

export function encodeTestLease(l: Partial<TestLease> = {}): Uint8Array {
  const lease: TestLease = {
    buyer: "11111111111111111111111111111112",
    registeredProgram: "11111111111111111111111111111113",
    templateId: "11111111111111111111111111111114",
    intervalMs: 500,
    iterations: 20,
    iterationsDone: 0,
    feePrepaid: 205000,
    feeSettled: 0,
    status: 0,
    createdAt: 0,
    expiresAt: 0,
    lastTickAt: 0,
    bump: 255,
    ...l,
  };
  return concatBytes(
    LEASE_DISCRIMINATOR,
    new PublicKey(lease.buyer).toBytes(),
    new PublicKey(lease.registeredProgram).toBytes(),
    new PublicKey(lease.templateId).toBytes(),
    u64ToBytes(lease.intervalMs),
    u32ToBytes(lease.iterations),
    u32ToBytes(lease.iterationsDone),
    u64ToBytes(lease.feePrepaid),
    u64ToBytes(lease.feeSettled),
    new Uint8Array([lease.status]),
    u64ToBytes(BigInt(lease.createdAt)),
    u64ToBytes(BigInt(lease.expiresAt)),
    u64ToBytes(BigInt(lease.lastTickAt)),
    new Uint8Array([lease.bump])
  );
}
