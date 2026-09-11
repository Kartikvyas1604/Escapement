import { NextResponse } from "next/server";
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
  buyerStatePda,
  decodeBuyerState,
  decodeMarket,
  leasePda,
  marketPda,
  mintLeaseData,
  registeredProgramPda,
  txExplorerUrl,
  vaultPda,
} from "escapement-client";
import { protocolKeypair } from "@/lib/escapement/server-keypair";
import {
  decodeHeader,
  encodeHeader,
  paymentRequiredBody,
  payToConfigured,
  settlePayment,
  solanaNetworkIdentifier,
  verifyPayment,
  type PaymentPayload,
  type SettlementResponse,
} from "@/lib/x402";

export const dynamic = "force-dynamic";

const ROUTE_TIMEOUT_MS = 25_000;
const INTERVAL_MIN_MS = 100;
const INTERVAL_MAX_MS = 2000;
const ITERATIONS_MIN = 1;
const ITERATIONS_MAX = 100;

/** On-chain bounds match the Escapement program constants and mint form. */
function validLeaseParams(intervalMs: unknown, iterations: unknown): boolean {
  return (
    Number.isInteger(intervalMs) &&
    Number.isInteger(iterations) &&
    (intervalMs as number) >= INTERVAL_MIN_MS &&
    (intervalMs as number) <= INTERVAL_MAX_MS &&
    (iterations as number) >= ITERATIONS_MIN &&
    (iterations as number) <= ITERATIONS_MAX
  );
}

let connection: Connection | null = null;
function rpc(): Connection {
  if (!connection) connection = new Connection(CONFIG.rpcUrl, "confirmed");
  return connection;
}

/**
 * Per-IP fixed-window rate limit. Agents may hammer this endpoint while
 * retrying payment flows; keep the surface tight.
 */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX_REQUESTS = 30;
const rateBuckets = new Map<string, { windowStart: number; count: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);
  if (!bucket || now - bucket.windowStart >= RATE_WINDOW_MS) {
    rateBuckets.set(ip, { windowStart: now, count: 1 });
  } else {
    bucket.count += 1;
    if (bucket.count > RATE_MAX_REQUESTS) return true;
  }
  if (rateBuckets.size > 10_000) {
    for (const [key, b] of rateBuckets) {
      if (now - b.windowStart >= RATE_WINDOW_MS) rateBuckets.delete(key);
      if (rateBuckets.size <= 5_000) break;
    }
  }
  return false;
}

function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return NextResponse.json(
      { error: "Too many lease requests from this address. Try again shortly." },
      { status: 429 }
    );
  }

  if (!payToConfigured()) {
    return NextResponse.json(
      { error: "x402 payments are not configured on this deployment (set X402_PAY_TO)." },
      { status: 503 }
    );
  }

  const protocol = protocolKeypair();
  if (!protocol) {
    return NextResponse.json(
      {
        error:
          "Protocol wallet is not configured on this deployment (set CRANK_KEYPAIR or CRANK_KEYPAIR_PATH).",
      },
      { status: 501 }
    );
  }

  let body: { intervalMs?: unknown; iterations?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!validLeaseParams(body.intervalMs, body.iterations)) {
    return NextResponse.json(
      {
        error: `intervalMs must be ${INTERVAL_MIN_MS}–${INTERVAL_MAX_MS} and iterations ${ITERATIONS_MIN}–${ITERATIONS_MAX}.`,
      },
      { status: 400 }
    );
  }

  const resourceUrl = new URL(request.url).toString();
  const description = "Mint an Escapement lease: scheduled execution rights on devnet.";
  const network = await solanaNetworkIdentifier();
  const pr = paymentRequiredBody(network, resourceUrl, description);
  const requirements = pr.accepts[0]!;
  const paymentHeader = request.headers.get("payment-signature");

  // -----------------------------------------------------------------------
  // No payment → HTTP 402 with the canonical PAYMENT-REQUIRED header.
  // -----------------------------------------------------------------------
  if (!paymentHeader) {
    return NextResponse.json(
      { x402: pr },
      { status: 402, headers: { "PAYMENT-REQUIRED": encodeHeader(pr) } }
    );
  }

  // -----------------------------------------------------------------------
  // Payment attached → verify (read-only) before the resource executes.
  // -----------------------------------------------------------------------
  let payload: PaymentPayload;
  try {
    payload = decodeHeader<PaymentPayload>(paymentHeader);
  } catch {
    return NextResponse.json(
      { error: "PAYMENT-SIGNATURE is not valid base64 JSON." },
      { status: 400 }
    );
  }

  let verification;
  try {
    verification = await verifyPayment(payload, requirements);
  } catch (err) {
    return NextResponse.json(
      {
        error: `Payment verification failed: ${
          err instanceof Error ? err.message : "facilitator unreachable"
        }.`,
      },
      { status: 502 }
    );
  }
  if (!verification.isValid) {
    const invalid = paymentRequiredBody(network, resourceUrl, description, verification.invalidReason);
    return NextResponse.json(
      { x402: invalid },
      { status: 402, headers: { "PAYMENT-REQUIRED": encodeHeader(invalid) } }
    );
  }

  // -----------------------------------------------------------------------
  // Payment verified → mint the lease with the protocol wallet as buyer.
  // -----------------------------------------------------------------------
  const intervalMs = body.intervalMs as number;
  const iterations = body.iterations as number;

  try {
    const marketInfo = await rpc().getAccountInfo(marketPda());
    if (!marketInfo) throw new Error("Market is not initialized on this cluster.");
    const market = decodeMarket(new Uint8Array(marketInfo.data));

    const registeredProgram = registeredProgramPda(new PublicKey(market.authority));
    const registeredInfo = await rpc().getAccountInfo(registeredProgram);
    if (!registeredInfo) throw new Error("No program template is registered for this market.");

    const buyerState = buyerStatePda(protocol.publicKey);
    const buyerStateInfo = await rpc().getAccountInfo(buyerState);
    const index = buyerStateInfo
      ? decodeBuyerState(new Uint8Array(buyerStateInfo.data)).nextIndex
      : 0;
    const leasePkey = leasePda(protocol.publicKey, index);

    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: protocol.publicKey, isSigner: true, isWritable: true },
          { pubkey: marketPda(), isSigner: false, isWritable: false },
          { pubkey: registeredProgram, isSigner: false, isWritable: false },
          { pubkey: buyerState, isSigner: false, isWritable: true },
          { pubkey: leasePkey, isSigner: false, isWritable: true },
          { pubkey: vaultPda(), isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: ESCAPEMENT_PROGRAM_ID,
        data: Buffer.from(mintLeaseData(intervalMs, iterations)),
      })
    );

    const mintSig = await sendWithTimeout(tx, protocol);

    // ---------------------------------------------------------------------
    // Resource served → settle the payment durably (authorization flow).
    // ---------------------------------------------------------------------
    let settleError: string | null = null;
    let settlement: SettlementResponse = { success: false };
    try {
      settlement = await settlePayment(payload, requirements);
      if (!settlement.success) {
        settleError = settlement.errorReason ?? "Facilitator settlement failed.";
      }
    } catch (err) {
      settleError = err instanceof Error ? err.message : "Facilitator settlement failed.";
    }

    const responseBody = {
      lease: {
        leasePda: leasePkey.toBase58(),
        buyer: protocol.publicKey.toBase58(),
        intervalMs,
        iterations,
        mintTxSig: mintSig,
        mintExplorerUrl: txExplorerUrl(mintSig),
      },
      payment: settleError ? { settled: false, error: settleError } : { settled: true },
    };

    return NextResponse.json(responseBody, {
      status: settleError ? 402 : 200,
      headers: { "PAYMENT-RESPONSE": encodeHeader(settlement) },
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Lease minting failed: ${err instanceof Error ? err.message : "unknown error"}.` },
      { status: 502 }
    );
  }
}

async function sendWithTimeout(tx: Transaction, authority: Keypair): Promise<string> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error("Lease mint transaction timed out.")), ROUTE_TIMEOUT_MS);
  });
  const send = (async () => {
    const signature = await rpc().sendTransaction(tx, [authority]);
    const latest = await rpc().confirmTransaction(signature, "confirmed");
    if (latest.value.err) {
      throw new Error(`Lease mint failed: ${JSON.stringify(latest.value.err)}`);
    }
    return signature;
  })();
  return Promise.race([send, timeout]);
}
