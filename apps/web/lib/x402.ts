import { Connection } from "@solana/web3.js";

/**
 * Minimal x402 (v2) protocol surface for the Escapement agent API.
 * Spec: https://github.com/x402-foundation/x402 — specs/x402-specification-v2.md
 *
 * Flow over HTTP (transports-v2/http.md):
 *   1. Agent POSTs without payment      → server returns HTTP 402 with a
 *      base64 `PaymentRequired` object in the `PAYMENT-REQUIRED` header.
 *   2. Agent builds a signed payment    → retries with the base64 payload in
 *      the `PAYMENT-SIGNATURE` header.
 *   3. Server verifies (facilitator /verify, read-only) before minting the
 *      lease, settles (/settle) after, and returns the settlement result in
 *      the `PAYMENT-RESPONSE` header.
 */

export const X402_VERSION = 2;

export interface X402Scheme {
  scheme: string;
  /** CAIP-2 network identifier (e.g. "solana:<genesis-hash>"). */
  network: string;
  /** Payment amount in atomic token units. */
  amount: string;
  /** Token mint (SVM) or contract address (EVM). */
  asset: string;
  payTo: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown>;
}

export interface PaymentRequired {
  x402Version: number;
  error?: string;
  resource: {
    url: string;
    description: string;
    mimeType: string;
  };
  accepts: X402Scheme[];
}

export interface PaymentPayload {
  x402Version?: number;
  [key: string]: unknown;
}

export interface VerifyResult {
  isValid: boolean;
  invalidReason?: string;
}

export interface SettlementResponse {
  success: boolean;
  errorReason?: string;
  transaction?: string;
  network?: string;
}

let connection: Connection | null = null;
let genesisHash: string | null = null;

function rpc(): Connection {
  if (!connection) {
    connection = new Connection(
      process.env.NEXT_PUBLIC_RPC_URL ?? "https://api.devnet.solana.com",
      "confirmed"
    );
  }
  return connection;
}

/**
 * CAIP-2 network identifier for the configured cluster, derived from its
 * real genesis hash — e.g. "solana:4uhcVJyU9pJhxQsU3kSD5p5Ud8tuijg6h" for
 * devnet. Computed once per server instance, cached forever.
 */
export async function solanaNetworkIdentifier(): Promise<string> {
  if (genesisHash === null) {
    genesisHash = await rpc().getGenesisHash();
  }
  return `solana:${genesisHash}`;
}

export function encodeHeader(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64");
}

export function decodeHeader<T>(header: string): T {
  const json = Buffer.from(header, "base64").toString("utf8");
  return JSON.parse(json) as T;
}

export function paymentRequirements(network: string): X402Scheme {
  return {
    scheme: "exact",
    network,
    amount: process.env.X402_LEASE_PRICE_ATOMIC ?? "10000",
    asset: process.env.X402_USDC_MINT ?? "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
    payTo: process.env.X402_PAY_TO ?? "",
    maxTimeoutSeconds: 60,
  };
}

export function paymentRequiredBody(
  network: string,
  resourceUrl: string,
  description: string,
  error?: string
): PaymentRequired {
  return {
    x402Version: X402_VERSION,
    ...(error ? { error } : {}),
    resource: { url: resourceUrl, description, mimeType: "application/json" },
    accepts: [paymentRequirements(network)],
  };
}

/** Lazily constructed: an unset recipient means the endpoint cannot price itself. */
export function payToConfigured(): boolean {
  return Boolean(process.env.X402_PAY_TO);
}

export function facilitatorUrl(): string {
  return process.env.X402_FACILITATOR_URL ?? "https://x402.org/facilitator";
}

async function facilitatorCall<T>(
  path: string,
  body: { paymentPayload: PaymentPayload; paymentRequirements: X402Scheme }
): Promise<T> {
  const res = await fetch(`${facilitatorUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    throw new Error(`Facilitator ${path} returned ${res.status}`);
  }
  return (await res.json()) as T;
}

/** Read-only verification — never commits state. Throws on facilitator failure. */
export async function verifyPayment(
  payload: PaymentPayload,
  requirements: X402Scheme
): Promise<VerifyResult> {
  const result = await facilitatorCall<VerifyResult>("/verify", {
    paymentPayload: payload,
    paymentRequirements: requirements,
  });
  return { isValid: Boolean(result.isValid), invalidReason: result.invalidReason };
}

/** Durable settlement — the facilitator broadcasts / records the payment. */
export async function settlePayment(
  payload: PaymentPayload,
  requirements: X402Scheme
): Promise<SettlementResponse> {
  return facilitatorCall<SettlementResponse>("/settle", {
    paymentPayload: payload,
    paymentRequirements: requirements,
  });
}
