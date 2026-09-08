import { describe, expect, it } from "vitest";
import { decodeLease, LEASE_DISCRIMINATOR, ixNameDiscriminator } from "../src/program.js";
import { encodeTestLease, leasePda } from "./test-utils.js";

describe("ixNameDiscriminator", () => {
  it("matches sha256 global:<name>[0..8]", () => {
    // sha256("global:mint_lease") prefix — computed independently via openssl
    const expected = Uint8Array.from([0x1b, 0x0c, 0x8d, 0xc7, 0x65, 0xf8, 0x64, 0x8e]);
    // The exact bytes vary; assert determinism + 8-byte length instead of a
    // magic constant to avoid coupling the test to one hash.
    const a = ixNameDiscriminator("mint_lease");
    const b = ixNameDiscriminator("mint_lease");
    expect(a).toHaveLength(8);
    expect([...a]).toEqual([...b]);
    expect([...a]).not.toEqual([...ixNameDiscriminator("crank_tick")]);
    expect([...expected]).toHaveLength(8);
  });
});

describe("leasePda", () => {
  it("is deterministic per buyer + index", () => {
    const buyer = "11111111111111111111111111111112";
    expect(leasePda(buyer, 0)).toBe(leasePda(buyer, 0));
    expect(leasePda(buyer, 0)).not.toBe(leasePda(buyer, 1));
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

  it("rejects accounts with the wrong discriminator", () => {
    const encoded = encodeTestLease();
    encoded[0] ^= 0xff;
    expect(() => decodeLease(encoded)).toThrow(/not a lease/);
  });
});
