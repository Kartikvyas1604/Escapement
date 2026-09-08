import { useSyncExternalStore } from "react";
import type {
  EscapementLease,
  FeeSettleReceipt,
  TickReceipt,
} from "escapement-client";
import { PRICING, quoteLeaseLamports } from "escapement-client";
import { getActiveProvider } from "@/lib/escapement/wallet-context";

const STORAGE_KEY = "escapement.lease.v1";
const GRACE_MS = 60_000;
const MAX_FEED = 10;
const DEVNET_RPC = "https://api.devnet.solana.com";
const MEMO_PROGRAM_ID = "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr";

export interface EscState {
  hydrated: boolean;
  lease: EscapementLease | null;
  ticks: TickReceipt[];
  receipt: FeeSettleReceipt | null;
  isMinting: boolean;
  isSettling: boolean;
  error: string | null;
}

const SERVER_STATE: EscState = {
  hydrated: false,
  lease: null,
  ticks: [],
  receipt: null,
  isMinting: false,
  isSettling: false,
  error: null,
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
    state = { ...state, error: "Browser storage is full — lease state is memory-only." };
  }
}

function getSnapshot(): EscState {
  return state;
}

function subscribe(listener: () => void) {
  if (!hydrated && typeof window !== "undefined") {
    hydrated = true;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Pick<EscState, "lease" | "ticks" | "receipt">;
        if (saved.lease?.status === "Active" && Date.now() > saved.lease.expiresAt) {
          saved.lease = { ...saved.lease, status: "Expired" };
        }
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

/**
 * Sends a memo transaction to Solana devnet through the connected wallet and
 * waits for confirmation. Returns the real transaction signature.
 */
async function sendMemoTx(payload: string, payer: string): Promise<string> {
  const provider = getActiveProvider();
  if (!provider) throw new Error("Wallet is not connected.");

  if (typeof globalThis.Buffer === "undefined") {
    const { Buffer } = await import("buffer");
    (globalThis as { Buffer?: unknown }).Buffer = Buffer;
  }
  const web3 = await import("@solana/web3.js");

  const tx = new web3.Transaction().add(
    new web3.TransactionInstruction({
      keys: [
        {
          pubkey: new web3.PublicKey(payer),
          isSigner: true,
          isWritable: false,
        },
      ],
      programId: new web3.PublicKey(MEMO_PROGRAM_ID),
      data: Buffer.from(new TextEncoder().encode(payload)),
    })
  );

  const { signature } = await provider.signAndSendTransaction(tx);
  const connection = new web3.Connection(DEVNET_RPC, "confirmed");
  const result = await connection.confirmTransaction(signature, "confirmed");
  if (result.value.err) {
    throw new Error(
      `Settlement transaction failed on devnet: ${JSON.stringify(result.value.err)}`
    );
  }
  return signature;
}

export async function mintLease(
  input: { intervalMs: number; iterations: number },
  buyer: string
): Promise<boolean> {
  update({ isMinting: true, error: null });
  try {
    const feeLamports = quoteLeaseLamports(input.iterations);
    const signature = await sendMemoTx(
      JSON.stringify({
        app: "escapement",
        type: "lease.mint",
        v: 1,
        buyer,
        intervalMs: input.intervalMs,
        iterations: input.iterations,
        feeLamports,
      }),
      buyer
    );
    const now = Date.now();
    const lease: EscapementLease = {
      id: signature,
      buyer,
      program: "counter-template",
      intervalMs: input.intervalMs,
      iterations: input.iterations,
      iterationsDone: 0,
      feePrepaidLamports: feeLamports,
      feeSettledLamports: 0,
      status: "Active",
      createdAt: now,
      expiresAt: now + input.intervalMs * input.iterations + GRACE_MS,
    };
    update({ lease, ticks: [], receipt: null, isMinting: false });
    return true;
  } catch (err) {
    update({ isMinting: false, error: walletErrorMessage(err) });
    return false;
  }
}

export function fireTick(): void {
  const lease = state.lease;
  if (!lease || lease.status !== "Active") return;

  if (Date.now() > lease.expiresAt) {
    update({ lease: { ...lease, status: "Expired" } });
    return;
  }

  const seq = lease.iterationsDone + 1;
  const tick: TickReceipt = {
    leaseId: lease.id,
    seq,
    success: true,
    at: Date.now(),
  };
  const next: EscapementLease = {
    ...lease,
    iterationsDone: seq,
    status: seq >= lease.iterations ? "Exhausted" : "Active",
  };
  update({
    lease: next,
    ticks: [tick, ...state.ticks].slice(0, MAX_FEED),
  });
}

export async function settleFees(): Promise<void> {
  const lease = state.lease;
  if (!lease || lease.iterationsDone === 0 || state.isSettling) return;
  update({ isSettling: true, error: null });
  update({
    lease: { ...lease, status: "Settling" },
  });
  try {
    const settled = Math.round(
      (lease.iterationsDone / lease.iterations) * lease.feePrepaidLamports
    );
    const signature = await sendMemoTx(
      JSON.stringify({
        app: "escapement",
        type: "lease.settle",
        v: 1,
        leaseId: lease.id,
        ticks: lease.iterationsDone,
        feeLamports: settled,
      }),
      lease.buyer
    );
    const receipt: FeeSettleReceipt = {
      leaseId: lease.id,
      amountLamports: settled,
      txSig: signature,
      committedAt: Date.now(),
    };
    update({
      isSettling: false,
      receipt,
      lease: { ...state.lease!, status: "Settled", feeSettledLamports: settled },
    });
  } catch (err) {
    update({
      isSettling: false,
      error: walletErrorMessage(err),
      lease: {
        ...state.lease!,
        status:
          state.lease!.iterationsDone >= state.lease!.iterations
            ? "Exhausted"
            : "Active",
      },
    });
  }
}

export function clearLease(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  state = { ...SERVER_STATE };
  listeners.forEach((l) => l());
}

export { PRICING };
