#!/usr/bin/env node
// One-time devnet setup: initialize the market and register the counter
// template program. Run after `bash scripts/deploy-devnet.sh`.
import fs from "node:fs";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { createHash } from "node:crypto";

const CLUSTER = process.env.CLUSTER_URL ?? "https://api.devnet.solana.com";
const WALLET_PATH = process.env.WALLET_PATH ?? `${process.env.HOME}/.config/solana/id.json`;
const ESCAPEMENT_PROGRAM_ID = new PublicKey(
  process.env.ESCAPEMENT_PROGRAM_ID ?? "KKAQbHv1YAHo3wAAVETEQGaPBix5tRHWdXcb4G28V6z"
);
const TEMPLATE_PROGRAM_ID = new PublicKey(
  process.env.TEMPLATE_PROGRAM_ID ?? "E52t2PvfqcE71MGafrLPJBgXN74WdRmkzUk9aBLLLHfi"
);
const FEE_BASE = Number(process.env.FEE_BASE ?? 5_000);
const FEE_PER_TICK = Number(process.env.FEE_PER_TICK ?? 10_000);

function discriminator(name) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

function findPda(seeds, programId) {
  return PublicKey.findProgramAddressSync(seeds, programId)[0];
}

const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_PATH, "utf8")))
);
const connection = new Connection(CLUSTER, "confirmed");

const market = findPda([Buffer.from("market")], ESCAPEMENT_PROGRAM_ID);
const vault = findPda([Buffer.from("vault")], ESCAPEMENT_PROGRAM_ID);
const registeredProgram = findPda(
  [Buffer.from("program"), payer.publicKey.toBuffer(), TEMPLATE_PROGRAM_ID.toBuffer()],
  ESCAPEMENT_PROGRAM_ID
);

const marketInfo = await connection.getAccountInfo(market);
const registeredInfo = await connection.getAccountInfo(registeredProgram);

if (!marketInfo) {
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: ESCAPEMENT_PROGRAM_ID,
    data: Buffer.concat([
      discriminator("initialize_market"),
      payer.publicKey.toBuffer(),
      u64(FEE_BASE),
      u64(FEE_PER_TICK),
    ]),
  });
  const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
  console.log(`initialize_market: ${sig}`);
} else {
  console.log("market already initialized:", market.toBase58());
}

// The vault PDA must be rent-exempt before it can receive escrowed fees.
const vaultInfo = await connection.getAccountInfo(vault);
const rentExempt = await connection.getMinimumBalanceForRentExemption(0);
if (!vaultInfo || vaultInfo.lamports < rentExempt) {
  const sig = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: payer.publicKey,
        toPubkey: vault,
        lamports: Math.max(rentExempt, 0) - (vaultInfo?.lamports ?? 0) + 1_000_000,
      })
    ),
    [payer]
  );
  console.log(`fund vault: ${sig}`);
} else {
  console.log("vault funded:", vaultInfo.lamports, "lamports");
}

if (!registeredInfo) {
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: registeredProgram, isSigner: false, isWritable: true },
      { pubkey: TEMPLATE_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: ESCAPEMENT_PROGRAM_ID,
    data: Buffer.concat([
      discriminator("register_program"),
      discriminator("bump_counter"),
    ]),
  });
  const sig = await sendAndConfirmTransaction(connection, new Transaction().add(ix), [payer]);
  console.log(`register_program: ${sig}`);
} else {
  console.log("template already registered:", registeredProgram.toBase58());
}

console.log(JSON.stringify({
  market: market.toBase58(),
  vault: vault.toBase58(),
  registeredProgram: registeredProgram.toBase58(),
  authority: payer.publicKey.toBase58(),
  feeBase: FEE_BASE,
  feePerTick: FEE_PER_TICK,
}, null, 2));

function u64(n) {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}
