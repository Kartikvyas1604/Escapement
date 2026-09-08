#!/usr/bin/env node
// End-to-end devnet proof: mint a real lease, crank real ticks, settle fees.
// Exercises the exact instruction builders the web app uses.
import fs from "node:fs";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ESCAPEMENT_PROGRAM_ID,
  TEMPLATE_PROGRAM_ID,
  buyerStatePda,
  counterPda,
  crankTickData,
  decodeBuyerState,
  decodeLease,
  decodeMarket,
  leasePda,
  marketPda,
  mintLeaseData,
  settleFeesData,
  vaultPda,
  registeredProgramPda,
} from "escapement-client";

const WALLET_PATH = process.env.WALLET_PATH ?? `${process.env.HOME}/.config/solana/id.json`;
const INTERVAL_MS = Number(process.env.E2E_INTERVAL_MS ?? 500);
const ITERATIONS = Number(process.env.E2E_ITERATIONS ?? 4);

const payer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(fs.readFileSync(WALLET_PATH, "utf8")))
);
const connection = new Connection("https://api.devnet.solana.com", "confirmed");

const market = marketPda();
const marketAccount = decodeMarket(
  new Uint8Array((await connection.getAccountInfo(market)).data)
);
console.log("market authority:", marketAccount.authority);
const registeredProgram = registeredProgramPda(new PublicKey(marketAccount.authority));

const buyerState = buyerStatePda(payer.publicKey);
const buyerStateInfo = await connection.getAccountInfo(buyerState);
const index = buyerStateInfo
  ? decodeBuyerState(new Uint8Array(buyerStateInfo.data)).nextIndex
  : 0;
const leasePkey = leasePda(payer.publicKey, index);
console.log("minting lease:", leasePkey.toBase58(), `#${index}`);

// --- mint_lease ------------------------------------------------------------
const mintTx = new Transaction().add(
  new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: false },
      { pubkey: registeredProgram, isSigner: false, isWritable: false },
      { pubkey: buyerState, isSigner: false, isWritable: true },
      { pubkey: leasePkey, isSigner: false, isWritable: true },
      { pubkey: vaultPda(), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: ESCAPEMENT_PROGRAM_ID,
    data: Buffer.from(mintLeaseData(INTERVAL_MS, ITERATIONS)),
  })
);
const mintSig = await connection.sendTransaction(mintTx, [payer]);
await confirm(mintSig);
console.log("mint:", mintSig);

// --- crank_tick x N --------------------------------------------------------
const crankTx = new Transaction().add(
  new TransactionInstruction({
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: false },
      { pubkey: leasePkey, isSigner: false, isWritable: true },
      { pubkey: registeredProgram, isSigner: false, isWritable: false },
      { pubkey: TEMPLATE_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: counterPda(leasePkey), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: ESCAPEMENT_PROGRAM_ID,
    data: Buffer.from(crankTickData()),
  })
);
for (let i = 0; i < ITERATIONS; i++) {
  const sig = await connection.sendTransaction(crankTx, [payer]);
  await confirm(sig);
  console.log(`tick ${i + 1}/${ITERATIONS}:`, sig);
}

// --- settle_fees -----------------------------------------------------------
const settleTx = new Transaction().add(
  new TransactionInstruction({
    keys: [
      { pubkey: new PublicKey(marketAccount.authority), isSigner: false, isWritable: true },
      { pubkey: market, isSigner: false, isWritable: false },
      { pubkey: leasePkey, isSigner: false, isWritable: true },
      { pubkey: vaultPda(), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: ESCAPEMENT_PROGRAM_ID,
    data: Buffer.from(settleFeesData()),
  })
);
const settleSig = await connection.sendTransaction(settleTx, [payer]);
await confirm(settleSig);
console.log("settle:", settleSig);

// --- final on-chain state --------------------------------------------------
const lease = decodeLease(
  new Uint8Array((await connection.getAccountInfo(leasePkey)).data)
);
console.log(JSON.stringify(lease, null, 2));
if (lease.status !== "Settled" || lease.iterationsDone !== ITERATIONS) {
  console.error("E2E FAILED — unexpected final lease state");
  process.exit(1);
}
console.log("E2E OK — lease settled on devnet");

async function confirm(signature) {
  const latest = await connection.confirmTransaction(signature, "confirmed");
  if (latest.value.err) throw new Error(`tx failed: ${JSON.stringify(latest.value.err)}`);
}
