import fs from "node:fs";
import { Keypair } from "@solana/web3.js";

/**
 * The protocol wallet: market authority and crank signer. On devnet the
 * mint_lease, crank_tick, and settle_fees paths all ride this single funded
 * key, loaded from the environment only — never from the repo.
 */
let cached: Keypair | null | undefined;
export function protocolKeypair(): Keypair | null {
  if (cached !== undefined) return cached;
  cached = null;
  try {
    if (process.env.CRANK_KEYPAIR) {
      cached = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(process.env.CRANK_KEYPAIR))
      );
    } else if (process.env.CRANK_KEYPAIR_PATH) {
      cached = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(process.env.CRANK_KEYPAIR_PATH, "utf8")))
      );
    }
  } catch {
    cached = null;
  }
  return cached;
}
