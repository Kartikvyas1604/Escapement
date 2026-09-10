import { createHash } from "node:crypto";
import { PublicKey } from "@solana/web3.js";

export const ESCAPEMENT_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_ESCAPEMENT_PROGRAM_ID ?? "KKAQbHv1YAHo3wAAVETEQGaPBix5tRHWdXcb4G28V6z"
);
export const TEMPLATE_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_TEMPLATE_PROGRAM_ID ?? "E52t2PvfqcE71MGafrLPJBgXN74WdRmkzUk9aBLLLHfi"
);

export const SEEDS = {
  market: "market",
  buyer: "buyer",
  registeredProgram: "program",
  lease: "lease",
  vault: "vault",
} as const;

if (
  typeof globalThis !== "undefined" &&
  typeof (globalThis as { window?: unknown }).window !== "undefined" &&
  !process.env.NEXT_PUBLIC_ESCAPEMENT_PROGRAM_ID &&
  process.env.NODE_ENV === "production"
) {
  console.warn(
    "escapement-client: NEXT_PUBLIC_ESCAPEMENT_PROGRAM_ID is not set — falling back to the bundled devnet program id."
  );
}

/** Lease status codes on-chain (u8). */
export const LEASE_STATUS = {
  0: "Active",
  1: "Exhausted",
  2: "Settled",
  3: "Expired",
} as const;
export type OnChainLeaseStatus = (typeof LEASE_STATUS)[keyof typeof LEASE_STATUS];

export const MARKET_STATUS = { 0: "Active", 1: "Paused" } as const;
export type RegisteredProgramStatus = (typeof MARKET_STATUS)[keyof typeof MARKET_STATUS];

/** On-chain lease account layout (borsh). */
export interface LeaseAccount {
  buyer: string;
  registeredProgram: string;
  templateId: string;
  intervalMs: number;
  iterations: number;
  iterationsDone: number;
  feePrepaid: number;
  feeSettled: number;
  status: OnChainLeaseStatus;
  createdAt: number;
  expiresAt: number;
  lastTickAt: number;
  bump: number;
}

/** Market config account (borsh). */
export interface MarketAccount {
  authority: string;
  feeBase: number;
  feePerTick: number;
  bump: number;
}

/** Registered program template (borsh). */
export interface RegisteredProgramAccount {
  authority: string;
  templateId: string;
  ixDiscriminator: Uint8Array;
  status: RegisteredProgramStatus;
  bump: number;
}

// ---------------------------------------------------------------------------
// PDAs
// ---------------------------------------------------------------------------

export function marketPda(programId: PublicKey = ESCAPEMENT_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(SEEDS.market)], programId)[0];
}

export function vaultPda(programId: PublicKey = ESCAPEMENT_PROGRAM_ID): PublicKey {
  return PublicKey.findProgramAddressSync([Buffer.from(SEEDS.vault)], programId)[0];
}

export function registeredProgramPda(
  authority: PublicKey,
  templateId: PublicKey = TEMPLATE_PROGRAM_ID,
  programId: PublicKey = ESCAPEMENT_PROGRAM_ID
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.registeredProgram), authority.toBuffer(), templateId.toBuffer()],
    programId
  )[0];
}

export function buyerStatePda(
  buyer: PublicKey,
  programId: PublicKey = ESCAPEMENT_PROGRAM_ID
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.buyer), buyer.toBuffer()],
    programId
  )[0];
}

export function leasePda(
  buyer: PublicKey,
  index: number,
  programId: PublicKey = ESCAPEMENT_PROGRAM_ID
): PublicKey {
  const indexBuf = Buffer.alloc(4);
  indexBuf.writeUInt32LE(index);
  return PublicKey.findProgramAddressSync(
    [Buffer.from(SEEDS.lease), buyer.toBuffer(), indexBuf],
    programId
  )[0];
}

export function counterPda(
  lease: PublicKey,
  templateId: PublicKey = TEMPLATE_PROGRAM_ID
): PublicKey {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("counter"), lease.toBuffer()],
    templateId
  )[0];
}

// ---------------------------------------------------------------------------
// Encoding
// ---------------------------------------------------------------------------

/** sha256("global:<snake_case_ix_name>")[0..8] — Anchor instruction discriminator. */
export function ixNameDiscriminator(name: string): Uint8Array {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

export function u64ToBytes(n: number | bigint): Uint8Array {
  const value = BigInt(n);
  if (value < 0n || value > 0xffff_ffff_ffff_ffffn) {
    throw new Error(`u64 out of range: ${n}`);
  }
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, value, true);
  return b;
}

export function u32ToBytes(n: number): Uint8Array {
  if (!Number.isInteger(n) || n < 0 || n > 0xffff_ffff) {
    throw new Error(`u32 out of range: ${n}`);
  }
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Instruction data builders (name = snake_case program instruction)
// ---------------------------------------------------------------------------

export function initializeMarketData(authority: PublicKey, feeBase: number, feePerTick: number): Uint8Array {
  return concatBytes(
    ixNameDiscriminator("initialize_market"),
    authority.toBytes(),
    u64ToBytes(feeBase),
    u64ToBytes(feePerTick)
  );
}

export function setMarketConfigData(feeBase: number, feePerTick: number): Uint8Array {
  return concatBytes(
    ixNameDiscriminator("set_market_config"),
    u64ToBytes(feeBase),
    u64ToBytes(feePerTick)
  );
}

export function registerProgramData(ixDiscriminator: Uint8Array): Uint8Array {
  return concatBytes(ixNameDiscriminator("register_program"), ixDiscriminator);
}

export function setProgramStatusData(status: number): Uint8Array {
  return concatBytes(ixNameDiscriminator("set_program_status"), new Uint8Array([status]));
}

export function mintLeaseData(intervalMs: number, iterations: number): Uint8Array {
  return concatBytes(
    ixNameDiscriminator("mint_lease"),
    u64ToBytes(intervalMs),
    u32ToBytes(iterations)
  );
}

export function crankTickData(): Uint8Array {
  return ixNameDiscriminator("crank_tick");
}

export function settleFeesData(): Uint8Array {
  return ixNameDiscriminator("settle_fees");
}

export function expireLeaseData(): Uint8Array {
  return ixNameDiscriminator("expire_lease");
}

// ---------------------------------------------------------------------------
// Account codecs (fixed borsh layout, little-endian)
// ---------------------------------------------------------------------------

/**
 * Strict borsh reader: every read is bounds-checked, every integer is
 * validated. A malformed or truncated account decodes as an error, never as
 * a plausible object.
 */
class Reader {
  offset = 0;
  constructor(public data: Uint8Array) {}

  private need(n: number): void {
    if (this.offset + n > this.data.length) {
      throw new Error(
        `Account data truncated: need ${n} byte(s) at offset ${this.offset}, have ${this.data.length - this.offset}`
      );
    }
  }

  u8(): number {
    this.need(1);
    return this.data[this.offset++]!;
  }

  u32(): number {
    this.need(4);
    const v = new DataView(this.data.buffer, this.data.byteOffset).getUint32(this.offset, true);
    this.offset += 4;
    return v;
  }

  u64(): number {
    this.need(8);
    const v = new DataView(this.data.buffer, this.data.byteOffset).getBigUint64(this.offset, true);
    this.offset += 8;
    if (v > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`u64 value ${v} exceeds safe integer precision`);
    }
    return Number(v);
  }

  i64(): number {
    this.need(8);
    const v = new DataView(this.data.buffer, this.data.byteOffset).getBigInt64(this.offset, true);
    this.offset += 8;
    if (v > BigInt(Number.MAX_SAFE_INTEGER) || v < -BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error(`i64 value ${v} exceeds safe integer precision`);
    }
    return Number(v);
  }

  pubkey(): string {
    this.need(32);
    const p = new PublicKey(this.data.slice(this.offset, this.offset + 32));
    this.offset += 32;
    return p.toBase58();
  }

  bytes(n: number): Uint8Array {
    this.need(n);
    const out = this.data.slice(this.offset, this.offset + n);
    this.offset += n;
    return out;
  }
}

const ACCOUNT_DISCRIMINATOR = (name: string) =>
  createHash("sha256").update(`account:${name}`).digest().subarray(0, 8);

export const LEASE_DISCRIMINATOR = ACCOUNT_DISCRIMINATOR("Lease");
export const MARKET_DISCRIMINATOR = ACCOUNT_DISCRIMINATOR("Market");
export const BUYER_STATE_DISCRIMINATOR = ACCOUNT_DISCRIMINATOR("BuyerState");
export const REGISTERED_PROGRAM_DISCRIMINATOR = ACCOUNT_DISCRIMINATOR("RegisteredProgram");

/** Exact serialized sizes (8-byte discriminator + fields), matching the Anchor layout. */
export const LEASE_ACCOUNT_SIZE = 8 + 154;
export const MARKET_ACCOUNT_SIZE = 8 + 49;
export const BUYER_STATE_ACCOUNT_SIZE = 8 + 4;
export const REGISTERED_PROGRAM_ACCOUNT_SIZE = 8 + 74;

function expectDiscriminator(
  data: Uint8Array,
  expected: Uint8Array,
  expectedSize: number,
  kind: string
): Reader {
  if (data.length !== expectedSize) {
    throw new Error(
      `Account is not a ${kind}: expected ${expectedSize} bytes, got ${data.length}`
    );
  }
  if (!expected.every((b, i) => data[i] === b)) {
    throw new Error(`Account is not a ${kind}: discriminator mismatch`);
  }
  return new Reader(data.subarray(8));
}

function decodeStatus<T extends string>(
  table: Record<number, T>,
  raw: number,
  kind: string
): T {
  const status = table[raw];
  if (status === undefined) {
    throw new Error(`Account is not a valid ${kind}: unknown status byte ${raw}`);
  }
  return status;
}

export function decodeLease(data: Uint8Array): LeaseAccount {
  const r = expectDiscriminator(data, LEASE_DISCRIMINATOR, LEASE_ACCOUNT_SIZE, "lease");
  const lease: LeaseAccount = {
    buyer: r.pubkey(),
    registeredProgram: r.pubkey(),
    templateId: r.pubkey(),
    intervalMs: r.u64(),
    iterations: r.u32(),
    iterationsDone: r.u32(),
    feePrepaid: r.u64(),
    feeSettled: r.u64(),
    status: decodeStatus(LEASE_STATUS, r.u8(), "lease"),
    createdAt: r.i64(),
    expiresAt: r.i64(),
    lastTickAt: r.i64(),
    bump: r.u8(),
  };
  return lease;
}

export function decodeMarket(data: Uint8Array): MarketAccount {
  const r = expectDiscriminator(data, MARKET_DISCRIMINATOR, MARKET_ACCOUNT_SIZE, "market account");
  const market: MarketAccount = {
    authority: r.pubkey(),
    feeBase: r.u64(),
    feePerTick: r.u64(),
    bump: r.u8(),
  };
  return market;
}

export function decodeBuyerState(data: Uint8Array): { nextIndex: number } {
  const r = expectDiscriminator(
    data,
    BUYER_STATE_DISCRIMINATOR,
    BUYER_STATE_ACCOUNT_SIZE,
    "buyer state"
  );
  return { nextIndex: r.u32() };
}

export function decodeRegisteredProgram(data: Uint8Array): RegisteredProgramAccount {
  const r = expectDiscriminator(
    data,
    REGISTERED_PROGRAM_DISCRIMINATOR,
    REGISTERED_PROGRAM_ACCOUNT_SIZE,
    "registered program"
  );
  const registered: RegisteredProgramAccount = {
    authority: r.pubkey(),
    templateId: r.pubkey(),
    ixDiscriminator: r.bytes(8),
    status: decodeStatus(MARKET_STATUS, r.u8(), "registered program"),
    bump: r.u8(),
  };
  return registered;
}
