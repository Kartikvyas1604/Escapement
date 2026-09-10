import { describe, expect, it } from "vitest";
import { PublicKey } from "@solana/web3.js";
import {
  decodeLease,
  decodeMarket,
  decodeBuyerState,
  decodeRegisteredProgram,
  ixNameDiscriminator,
  leasePda,
  marketPda,
  vaultPda,
  u32ToBytes,
  u64ToBytes,
  concatBytes,
  LEASE_DISCRIMINATOR,
  LEASE_ACCOUNT_SIZE,
  BUYER_STATE_DISCRIMINATOR,
  REGISTERED_PROGRAM_DISCRIMINATOR,
  MARKET_DISCRIMINATOR,
} from "../src/program.js";
import { encodeTestLease } from "./test-utils.js";

describe("ixNameDiscriminator", () => {
  it("matches the Anchor scheme sha256(global:<name>)[0..8]", () => {
    // Reference bytes computed independently (node crypto, verified 2026-09).
    const mintLease = [0x0c, 0xc3, 0x9a, 0x89, 0xf7, 0x70, 0x8b, 0x37];
    const crankTick = [0x96, 0xbb, 0x17, 0xfc, 0x99, 0xc9, 0x33, 0x85];
    expect([...ixNameDiscriminator("mint_lease")]).toEqual(mintLease);
    expect([...ixNameDiscriminator("crank_tick")]).toEqual(crankTick);
    expect([...ixNameDiscriminator("mint_lease")]).toHaveLength(8);
  });
});

describe("PDAs", () => {
  it("leasePda is deterministic per buyer + index and matches the reference scheme", () => {
    const buyer = new PublicKey("11111111111111111111111111111112");
    // Independent derivation of the same scheme.
    const expected = PublicKey.findProgramAddressSync(
      [Buffer.from("lease"), buyer.toBuffer(), Buffer.from([0, 0, 0, 0])],
      new PublicKey("KKAQbHv1YAHo3wAAVETEQGaPBix5tRHWdXcb4G28V6z")
    )[0];
    expect(leasePda(buyer, 0).toBase58()).toBe(expected.toBase58());
    expect(leasePda(buyer, 0).toBase58()).not.toBe(leasePda(buyer, 1).toBase58());
  });

  it("market and vault PDAs are stable", () => {
    const a = marketPda().toBase58();
    const b = vaultPda().toBase58();
    expect(a).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(b).toMatch(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/);
    expect(a).not.toBe(b);
  });
});

describe("byte builders", () => {
  it("u32ToBytes encodes little-endian and rejects out-of-range", () => {
    expect([...u32ToBytes(1)]).toEqual([1, 0, 0, 0]);
    expect(() => u32ToBytes(-1)).toThrow(/out of range/);
    expect(() => u32ToBytes(0x1_0000_0000)).toThrow(/out of range/);
    expect(() => u32ToBytes(1.5)).toThrow(/out of range/);
  });

  it("u64ToBytes rejects out-of-range values", () => {
    expect([...u64ToBytes(0n)]).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(() => u64ToBytes(-1)).toThrow(/out of range/);
    expect(() => u64ToBytes(0x1_0000_0000_0000_0000n)).toThrow(/out of range/);
  });
});

describe("decodeLease", () => {
  it("round-trips a borsh-encoded lease account", () => {
    const encoded = encodeTestLease({
      buyer: "11111111111111111111111111111112",
      registeredProgram: "11111111111111111111111111111113",
      templateId: "11111111111111111111111111111114",
      intervalMs: 500,
      iterations: 20,
      iterationsDone: 3,
      feePrepaid: 205000,
      feeSettled: 0,
      status: 0,
      createdAt: 1_757_000_000,
      expiresAt: 1_757_000_070,
      lastTickAt: 0,
      bump: 254,
    });
    const lease = decodeLease(encoded);
    expect(lease.iterationsDone).toBe(3);
    expect(lease.intervalMs).toBe(500);
    expect(lease.feePrepaid).toBe(205000);
    expect(lease.status).toBe("Active");
    expect(lease.bump).toBe(254);
    expect(Array.from(encoded.slice(0, 8))).toEqual(Array.from(LEASE_DISCRIMINATOR));
  });

  it("decodes every lease status byte", () => {
    expect(decodeLease(encodeTestLease({ status: 0 })).status).toBe("Active");
    expect(decodeLease(encodeTestLease({ status: 1 })).status).toBe("Exhausted");
    expect(decodeLease(encodeTestLease({ status: 2 })).status).toBe("Settled");
    expect(decodeLease(encodeTestLease({ status: 3 })).status).toBe("Expired");
  });

  it("rejects accounts with the wrong discriminator", () => {
    const encoded = encodeTestLease();
    encoded[0] ^= 0xff;
    expect(() => decodeLease(encoded)).toThrow(/not a lease/);
  });

  it("rejects truncated account data", () => {
    const encoded = encodeTestLease();
    const truncated = encoded.slice(0, LEASE_ACCOUNT_SIZE - 1);
    expect(() => decodeLease(truncated)).toThrow(/truncated|not a lease/);
  });

  it("rejects oversized account data", () => {
    const encoded = concatBytes(encodeTestLease(), new Uint8Array(16));
    expect(() => decodeLease(encoded)).toThrow(/expected 162 bytes/);
  });

  it("rejects unknown status bytes instead of defaulting to Active", () => {
    const encoded = encodeTestLease({ status: 99 });
    expect(() => decodeLease(encoded)).toThrow(/unknown status byte/);
  });

  it("rejects u64 fields beyond safe integer precision", () => {
    const encoded = concatBytes(
      LEASE_DISCRIMINATOR,
      new PublicKey("11111111111111111111111111111112").toBytes(),
      new PublicKey("11111111111111111111111111111113").toBytes(),
      new PublicKey("11111111111111111111111111111114").toBytes(),
      u64ToBytes(0xffff_ffff_ffff_ffffn),
      u32ToBytes(20),
      u32ToBytes(0),
      u64ToBytes(205000),
      u64ToBytes(0),
      new Uint8Array([0]),
      u64ToBytes(0n),
      u64ToBytes(0n),
      u64ToBytes(0n),
      new Uint8Array([255])
    );
    expect(() => decodeLease(encoded)).toThrow(/safe integer/);
  });
});

describe("decodeMarket / decodeBuyerState / decodeRegisteredProgram", () => {
  const authority = new PublicKey("11111111111111111111111111111112").toBase58();
  const templateId = new PublicKey("11111111111111111111111111111113").toBase58();

  it("decodes a market account", () => {
    const encoded = concatBytes(
      MARKET_DISCRIMINATOR,
      new PublicKey(authority).toBytes(),
      u64ToBytes(5000),
      u64ToBytes(10000),
      new Uint8Array([251])
    );
    const market = decodeMarket(encoded);
    expect(market.authority).toBe(authority);
    expect(market.feeBase).toBe(5000);
    expect(market.feePerTick).toBe(10000);
    expect(market.bump).toBe(251);
  });

  it("decodes buyer state", () => {
    const encoded = concatBytes(BUYER_STATE_DISCRIMINATOR, u32ToBytes(7));
    expect(decodeBuyerState(encoded).nextIndex).toBe(7);
  });

  it("decodes a registered program", () => {
    const encoded = concatBytes(
      REGISTERED_PROGRAM_DISCRIMINATOR,
      new PublicKey(authority).toBytes(),
      new PublicKey(templateId).toBytes(),
      new Uint8Array(8).fill(0xab),
      new Uint8Array([0]),
      new Uint8Array([250])
    );
    const rp = decodeRegisteredProgram(encoded);
    expect(rp.authority).toBe(authority);
    expect(rp.templateId).toBe(templateId);
    expect(rp.status).toBe("Active");
    expect(rp.bump).toBe(250);
  });

  it("rejects market data of the wrong length", () => {
    expect(() => decodeMarket(new Uint8Array(56))).toThrow(/not a market account/);
  });
});
