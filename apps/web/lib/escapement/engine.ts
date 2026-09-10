import { useSyncExternalStore } from "react";
import {
  Connection,
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
  buyerStatePda,
  decodeBuyerState,
  decodeLease,
  decodeMarket,
  leasePda,
  marketPda,
  mintLeaseData,
  registeredProgramPda,
  settleFeesData,
  vaultPda,
} from "escapement-client";
import type {
  EscapementLease,
  FeeSettleReceipt,
  MarketAccount,
  TickReceipt,
} from "escapement-client";
import "./buffer-polyfill";
import { getActiveProvider } from "@/lib/escapement/wallet-context";

const STORAGE_KEY = "escapement.lease.v2";
const MAX_FEED = 10;

export interface EscState {
  hydrated: boolean;
  market: MarketAccount | null;
  lease: EscapementLease | null;
  ticks: TickReceipt[];
  receipt: FeeSettleReceipt | null;
  isMinting: boolean;
  isSettling: boolean;
  error: string | null;
  /** Which user action failed — drives the error banner's retry button. */
  errorAction: "mint" | "crank" | "settle" | null;
}

const SERVER_STATE: EscState = {
  hydrated: false,
  market: null,
  lease: null,
  ticks: [],
  receipt: null,
  isMinting: false,
  isSettling: false,
  error: null,
  errorAction: null,
};

let state: EscState = SERVER_STATE;
let hydrated = false;
const listeners = new Set<() => void>();

function update(patch: Partial<EscState>) {
  state = { ...state, ...patch };
  persist();
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        lease: state.lease,
        ticks: state.ticks,
        receipt: state.receipt,
      })
    );
  } catch {
    // Storage full / blocked — state stays memory-only, which is valid.
  }
}

/** Minimal runtime shape check for a persisted lease before it is trusted. */
function isValidStoredLease(v: unknown): v is EscapementLease {
  if (typeof v !== "object" || v === null) return false;
  const l = v as Record<string, unknown>;
  return (
    typeof l.leasePda === "string" &&
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(l.leasePda) &&
    typeof l.buyer === "string" &&
    /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(l.buyer) &&
    typeof l.intervalMs === "number" &&
    typeof l.iterations === "number" &&
    typeof l.iterationsDone === "number" &&
    typeof l.feePrepaidLamports === "number" &&
    typeof l.status === "string"
  );
}

function getSnapshot(): EscState {
  return state;
}

function subscribe(listener: () => void) {
  if (!hydrated) {
    hydrated = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Pick<EscState, "lease" | "ticks" | "receipt">;
        // Trust nothing blindly: a tampered or corrupted payload is dropped
        // rather than fed into PDAs and explorer links.
        const lease =
          saved.lease && isValidStoredLease(saved.lease) ? saved.lease : null;
        const ticks = Array.isArray(saved.ticks)
          ? saved.ticks.filter(
              (t): t is TickReceipt =>
                typeof t === "object" &&
                t !== null &&
                typeof (t as TickReceipt).seq === "number"
            )
          : [];
        const receipt = saved.receipt && typeof saved.receipt.txSig === "string" ? saved.receipt : null;
        if (
          lease?.status === "Active" &&
          Date.now() > lease.expiresAt + 60_000
        ) {
          saved.lease = { ...lease, status: "Expired" };
        } else {
          saved.lease = lease;
        }
        saved.ticks = ticks;
        saved.receipt = receipt;
        state = { ...SERVER_STATE, ...saved };
      }
    } catch {
      state = SERVER_STATE;
    }
    state = { ...state, hydrated: true };
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useEscapement(): EscState {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_STATE);
}

function walletErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    if (/reject/i.test(err.message)) {
      return "Wallet request was rejected — no transaction was signed.";
    }
    return err.message;
  }
  return "The wallet transaction failed. Check the wallet extension for details.";
}

// ---------------------------------------------------------------------------
// RPC helpers (reads go straight to the configured cluster)
// ---------------------------------------------------------------------------

let connection: Connection | null = null;
function rpc(): Connection {
  if (!connection) connection = new Connection(CONFIG.rpcUrl, "confirmed");
  return connection;
}

export const PROGRAM_ID = ESCAPEMENT_PROGRAM_ID;

/** Fetch and decode the on-chain market config — fees come from the chain. */
export async function fetchMarket(): Promise<MarketAccount | null> {
  const info = await rpc().getAccountInfo(marketPda());
  if (!info) return null;
  const market = decodeMarket(new Uint8Array(info.data));
  if (state.market?.authority !== market.authority) {
    update({ market });
  }
  return market;
}

/** Re-read the lease account from the chain and mirror it into local state. */
export async function syncLease(): Promise<void> {
  const lease = state.lease;
  if (!lease) return;
  try {
    const info = await rpc().getAccountInfo(new PublicKey(lease.leasePda));
    if (!info) return;
    const onChain = decodeLease(new Uint8Array(info.data));
    const next: EscapementLease = {
      ...lease,
      iterationsDone: onChain.iterationsDone,
      feePrepaidLamports: onChain.feePrepaid,
      feeSettledLamports: onChain.feeSettled,
      status: onChain.status,
      createdAt: onChain.createdAt * 1000,
      expiresAt: onChain.expiresAt * 1000,
      intervalMs: onChain.intervalMs,
      iterations: onChain.iterations,
      templateId: onChain.templateId,
    };
    // Crank ticks can land outside this tab (server crank); backfill the feed.
    let ticks = state.ticks;
    if (onChain.iterationsDone > lease.iterationsDone) {
      const seen = new Set(ticks.map((t) => t.seq));
      const missing: TickReceipt[] = [];
      for (let seq = lease.iterationsDone + 1; seq <= onChain.iterationsDone; seq++) {
        if (!seen.has(seq)) {
          missing.push({ leasePda: lease.leasePda, seq, success: true, at: Date.now() });
        }
      }
      ticks = [...missing, ...ticks].slice(0, MAX_FEED);
    }
    update({ lease: next, ticks });
  } catch {
    // Network hiccup — retried on the next sync.
  }
}

// ---------------------------------------------------------------------------
// Wallet signing
// ---------------------------------------------------------------------------

async function signAndConfirm(tx: Transaction): Promise<string> {
  const provider = getActiveProvider();
  if (!provider) throw new Error("Wallet is not connected.");
  const { signature } = await provider.signAndSendTransaction(tx);
  const result = await rpc().confirmTransaction(signature, "confirmed");
  if (result.value.err) {
    throw new Error(`Transaction failed on devnet: ${JSON.stringify(result.value.err)}`);
  }
  return signature;
}

function requireBuyer(): PublicKey {
  const pk = getActiveProvider()?.publicKey;
  if (!pk) throw new Error("Wallet is not connected.");
  return new PublicKey(pk.toString());
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

/**
 * Mints a real Escapement lease: creates the lease PDA via the Escapement
 * program and escrows the prepaid fee in the market vault.
 */
export async function mintLease(input: {
  intervalMs: number;
  iterations: number;
}): Promise<boolean> {
  update({ isMinting: true, error: null });
  try {
    const buyer = requireBuyer();

    // Fee schedule and template registration come from the chain.
    const market = state.market ?? (await fetchMarket());
    if (!market) throw new Error("Market is not initialized on this cluster.");
    const registeredProgram = registeredProgramPda(new PublicKey(market.authority));

    const registeredInfo = await rpc().getAccountInfo(registeredProgram);
    if (!registeredInfo) {
      throw new Error("No program template is registered for this market yet.");
    }

    const buyerState = buyerStatePda(buyer);
    const buyerStateInfo = await rpc().getAccountInfo(buyerState);
    const index = buyerStateInfo
      ? decodeBuyerState(new Uint8Array(buyerStateInfo.data)).nextIndex
      : 0;
    const leasePkey = leasePda(buyer, index);

    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: buyer, isSigner: true, isWritable: true },
          { pubkey: marketPda(), isSigner: false, isWritable: false },
          { pubkey: registeredProgram, isSigner: false, isWritable: false },
          { pubkey: buyerState, isSigner: false, isWritable: true },
          { pubkey: leasePkey, isSigner: false, isWritable: true },
          { pubkey: vaultPda(), isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: ESCAPEMENT_PROGRAM_ID,
        data: Buffer.from(mintLeaseData(input.intervalMs, input.iterations)),
      })
    );

    const signature = await signAndConfirm(tx);

    // Mirror the freshly minted on-chain lease into local state.
    const leaseInfo = await rpc().getAccountInfo(leasePkey);
    if (!leaseInfo) throw new Error("Lease account was not found after minting.");
    const onChain = decodeLease(new Uint8Array(leaseInfo.data));
    const lease: EscapementLease = {
      leasePda: leasePkey.toBase58(),
      buyer: onChain.buyer,
      index,
      templateId: onChain.templateId,
      registeredProgram: onChain.registeredProgram,
      intervalMs: onChain.intervalMs,
      iterations: onChain.iterations,
      iterationsDone: 0,
      feePrepaidLamports: onChain.feePrepaid,
      feeSettledLamports: 0,
      status: onChain.status,
      createdAt: onChain.createdAt * 1000,
      expiresAt: onChain.expiresAt * 1000,
      mintTxSig: signature,
    };
    update({ lease, ticks: [], receipt: null, isMinting: false });
    return true;
  } catch (err) {
    update({
      isMinting: false,
      error: walletErrorMessage(err),
      errorAction: "mint",
    });
    return false;
  }
}

let crankInFlight = false;

/**
 * Fires one tick by submitting a real crank_tick transaction. Uses the
 * protocol crank endpoint when available (gasless for the buyer); falls
 * back to a buyer-signed crank transaction otherwise.
 */
export async function crankTick(): Promise<void> {
  const lease = state.lease;
  if (crankInFlight || !lease || lease.status !== "Active") return;
  if (Date.now() > lease.expiresAt) {
    update({ lease: { ...lease, status: "Expired" } });
    return;
  }
  if (lease.iterationsDone >= lease.iterations) {
    update({ lease: { ...lease, status: "Exhausted" } });
    return;
  }
  crankInFlight = true;
  try {
    const res = await fetch("/api/crank", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leasePda: lease.leasePda }),
    });
    if (res.status === 501) throw new Error("__no_server_crank__");
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string; code?: string } | null;
      // A cooldown rejection is expected pacing at minimum cadence, not a
      // failure — the next interval retry will land. Never surface it.
      if (res.status === 429 || body?.code === "cooldown") return;
      throw new Error(body?.error ?? `Crank endpoint returned ${res.status}`);
    }
    const body = (await res.json()) as { txSig: string };
    // The chain is the source of truth; backfill any new ticks on sync.
    await syncLease();
    if (state.lease && state.lease.iterationsDone > lease.iterationsDone) {
      const seen = new Set(state.ticks.map((t) => t.seq));
      const tick: TickReceipt = {
        leasePda: lease.leasePda,
        seq: state.lease.iterationsDone,
        success: true,
        at: Date.now(),
        txSig: body.txSig,
      };
      if (!seen.has(tick.seq)) {
        update({ ticks: [tick, ...state.ticks].slice(0, MAX_FEED) });
      }
    }
    // A successful tick clears any stale error.
    update({ error: null, errorAction: null });
  } catch (err) {
    if (err instanceof Error && err.message === "__no_server_crank__") {
      try {
        await buyerSignedCrank();
        update({ error: null, errorAction: null });
      } catch (fallbackErr) {
        update({
          error: walletErrorMessage(fallbackErr),
          errorAction: "crank",
        });
      }
      return;
    }
    // Crank failures retry on the next interval; surface them, but transient
    // network noise clears itself on the next successful tick.
    update({
      error: err instanceof Error ? err.message : "Crank failed.",
      errorAction: "crank",
    });
  } finally {
    crankInFlight = false;
  }
}

/** Fallback: the buyer's own wallet signs the crank_tick transaction. */
async function buyerSignedCrank(): Promise<void> {
  const lease = state.lease;
  if (!lease) return;
  const market = state.market ?? (await fetchMarket());
  if (!market) throw new Error("Market is not initialized on this cluster.");
  const buyer = requireBuyer();

  const tx = new Transaction().add(
    new TransactionInstruction({
      keys: [
        { pubkey: buyer, isSigner: true, isWritable: true },
        { pubkey: marketPda(), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(lease.leasePda), isSigner: false, isWritable: true },
        { pubkey: new PublicKey(lease.registeredProgram), isSigner: false, isWritable: false },
        { pubkey: new PublicKey(lease.templateId), isSigner: false, isWritable: false },
        { pubkey: counterPda(new PublicKey(lease.leasePda)), isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      programId: ESCAPEMENT_PROGRAM_ID,
      data: Buffer.from(crankTickData()),
    })
  );
  const signature = await signAndConfirm(tx);
  const tick: TickReceipt = {
    leasePda: lease.leasePda,
    seq: lease.iterationsDone + 1,
    success: true,
    at: Date.now(),
    txSig: signature,
  };
  await syncLease();
  update({ ticks: [tick, ...state.ticks].slice(0, MAX_FEED) });
}

/**
 * Settles the executed share of the prepaid fee via the settle_fees
 * instruction. Permissionless on-chain; the buyer signs here for UX.
 * A partial settle keeps the lease live — the chain is the source of truth.
 */
export async function settleFees(): Promise<void> {
  const lease = state.lease;
  if (!lease || lease.iterationsDone === 0 || state.isSettling) return;
  update({ isSettling: true, error: null, errorAction: null });
  try {
    const market = state.market ?? (await fetchMarket());
    if (!market) throw new Error("Market is not initialized on this cluster.");

    const tx = new Transaction().add(
      new TransactionInstruction({
        keys: [
          { pubkey: new PublicKey(market.authority), isSigner: false, isWritable: true },
          { pubkey: marketPda(), isSigner: false, isWritable: false },
          { pubkey: new PublicKey(lease.leasePda), isSigner: false, isWritable: true },
          { pubkey: vaultPda(), isSigner: false, isWritable: true },
          { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        programId: ESCAPEMENT_PROGRAM_ID,
        data: Buffer.from(settleFeesData()),
      })
    );

    const signature = await signAndConfirm(tx);
    const before = lease.feeSettledLamports;
    await syncLease();

    // Read the settled amount back from the chain — never trust local math.
    const current = state.lease;
    const settledAmount = current
      ? Math.max(0, current.feeSettledLamports - before)
      : Math.round((lease.iterationsDone / lease.iterations) * lease.feePrepaidLamports);
    const receipt: FeeSettleReceipt = {
      leasePda: lease.leasePda,
      amountLamports: settledAmount,
      txSig: signature,
      committedAt: Date.now(),
    };
    update({
      isSettling: false,
      receipt,
      lease: current ?? lease,
    });
  } catch (err) {
    update({
      isSettling: false,
      error: walletErrorMessage(err),
      errorAction: "settle",
    });
    await syncLease();
  }
}

export function clearLease(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  state = { ...SERVER_STATE, hydrated: true, market: state.market };
  listeners.forEach((l) => l());
}

// ---------------------------------------------------------------------------
// Cross-tab + wallet-account reconciliation
// ---------------------------------------------------------------------------

if (typeof window !== "undefined") {
  // Two tabs sharing one lease must agree instead of fighting over the
  // tick feed — adopt whatever the other tab persisted.
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY || e.storageArea !== window.localStorage) return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Pick<EscState, "lease" | "ticks" | "receipt">;
      const lease = saved.lease && isValidStoredLease(saved.lease) ? saved.lease : null;
      const ticks = Array.isArray(saved.ticks)
        ? saved.ticks.filter(
            (t): t is TickReceipt =>
              typeof t === "object" &&
              t !== null &&
              typeof (t as TickReceipt).seq === "number"
          )
        : [];
      // Adopt without persisting — the other tab already wrote the data.
      state = { ...state, lease, ticks, receipt: saved.receipt ?? null };
      listeners.forEach((l) => l());
    } catch {
      // Malformed cross-tab payload — ignore, local state is untouched.
    }
  });

  // If the connected wallet account changes to one that does not own the
  // stored lease, stop showing that lease.
  window.addEventListener("escapement:account", () => {
    const lease = state.lease;
    const pk = getActiveProvider()?.publicKey;
    if (lease && pk && lease.buyer !== pk.toString()) {
      clearLease();
    }
  });
}
