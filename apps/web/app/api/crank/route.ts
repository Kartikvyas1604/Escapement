import { NextResponse } from "next/server";
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
  CONFIG,
  ESCAPEMENT_PROGRAM_ID,
  crankTickData,
  counterPda,
  decodeLease,
  marketPda,
} from "escapement-client";

export const dynamic = "force-dynamic";

const ROUTE_TIMEOUT_MS = 25_000;

let cachedKeypair: Keypair | null | undefined;
function crankKeypair(): Keypair | null {
  if (cachedKeypair !== undefined) return cachedKeypair;
  cachedKeypair = null;
  try {
    if (process.env.CRANK_KEYPAIR) {
      cachedKeypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(process.env.CRANK_KEYPAIR))
      );
    } else if (process.env.CRANK_KEYPAIR_PATH) {
      cachedKeypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(process.env.CRANK_KEYPAIR_PATH, "utf8")))
      );
    }
  } catch {
    cachedKeypair = null;
  }
  return cachedKeypair;
}

let connection: Connection | null = null;
function rpc(): Connection {
  if (!connection) connection = new Connection(CONFIG.rpcUrl, "confirmed");
  return connection;
}

/**
 * Per-lease cooldown so a lease can only be cranked at its own cadence.
 * Prevents a hammering client from burning a buyer's prepaid iterations
 * faster than the purchased schedule.
 */
const lastCrankAt = new Map<string, number>();
function cooldownRemaining(leasePda: string, intervalMs: number): number {
  const last = lastCrankAt.get(leasePda) ?? 0;
  const elapsed = Date.now() - last;
  return Math.max(0, intervalMs - elapsed);
}

export async function POST(request: Request) {
  const authority = crankKeypair();
  if (!authority) {
    return NextResponse.json(
      {
        error:
          "Protocol crank is not configured on this deployment (set CRANK_KEYPAIR or CRANK_KEYPAIR_PATH).",
      },
      { status: 501 }
    );
  }

  let body: { leasePda?: string };
  try {
    body = (await request.json()) as { leasePda?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!body.leasePda || !/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(body.leasePda)) {
    return NextResponse.json({ error: "leasePda is required." }, { status: 400 });
  }

  let leasePkey: PublicKey;
  try {
    leasePkey = new PublicKey(body.leasePda);
  } catch {
    return NextResponse.json({ error: "leasePda is not a valid public key." }, { status: 400 });
  }

  const leaseInfo = await rpc().getAccountInfo(leasePkey);
  if (!leaseInfo) {
    return NextResponse.json({ error: "Lease account not found." }, { status: 404 });
  }
  let lease;
  try {
    lease = decodeLease(new Uint8Array(leaseInfo.data));
  } catch {
    return NextResponse.json({ error: "Account is not an Escapement lease." }, { status: 400 });
  }
  if (lease.status !== "Active") {
    return NextResponse.json({ error: `Lease is ${lease.status}.` }, { status: 409 });
  }
  if (lease.iterationsDone >= lease.iterations) {
    return NextResponse.json({ error: "Lease is exhausted." }, { status: 409 });
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec > lease.expiresAt) {
    return NextResponse.json({ error: "Lease is expired." }, { status: 409 });
  }

  const cooldown = cooldownRemaining(leasePkey.toBase58(), lease.intervalMs);
  if (cooldown > 0) {
    return NextResponse.json(
      {
        error: `Crank cooldown active for another ${cooldown}ms.`,
        code: "cooldown",
      },
      { status: 429 }
    );
  }

  // The market authority (this keypair) or the buyer may crank.
  const market = marketPda();
  const isAuthority = lease.buyer === authority.publicKey.toBase58() || true; // authority may crank any lease
  void isAuthority;

  const tx = new Transaction().add(
    new TransactionInstruction({
      keys: [
        { pubkey: authority.publicKey, isSigner: true, isWritable: true },
        { pubkey: market, isSigner: false, isWritable: false },
        { pubkey: leasePkey, isSigner: false, isWritable: true },
        { pubkey: new PublicKey(lease.registeredProgram), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(lease.templateId), isSigner: false, isWritable: false },
        { pubkey: counterPda(leasePkey), isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: ESCAPEMENT_PROGRAM_ID,
      data: Buffer.from(crankTickData()),
    })
  );

  try {
    const signature = await sendWithTimeout(tx, authority);
    lastCrankAt.set(leasePkey.toBase58(), Date.now());
    return NextResponse.json({
      txSig: signature,
      lease: { iterationsDone: lease.iterationsDone + 1 },
      counter: counterPda(leasePkey).toBase58(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Crank transaction failed.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

async function sendWithTimeout(tx: Transaction, authority: Keypair): Promise<string> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Crank transaction timed out.")), ROUTE_TIMEOUT_MS);
  });
  const send = (async () => {
    const signature = await rpc().sendTransaction(tx, [authority]);
    const latest = await rpc().confirmTransaction(signature, "confirmed");
    if (latest.value.err) {
      throw new Error(`Crank transaction failed: ${JSON.stringify(latest.value.err)}`);
    }
    return signature;
  })();
  return Promise.race([send, timeout]);
}
