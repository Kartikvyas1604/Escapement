import { useSyncExternalStore } from "react";
import type {
  EscapementLease,
  FeeSettleReceipt,
  TickReceipt,
} from "@/lib/escapement/types";
import { PRICING, quoteLeaseLamports } from "@/lib/escapement/pricing";

const STORAGE_KEY = "escapement.lease.v1";
const GRACE_MS = 60_000;
const MAX_FEED = 10;
const SETTLE_FAIL_RATE = 0.0;

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

function randomBase58(length: number): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

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

export async function mintLease(
  input: { intervalMs: number; iterations: number },
  buyer: string
): Promise<void> {
  update({ isMinting: true, error: null });
  await new Promise((resolve) => setTimeout(resolve, 900));
  const now = Date.now();
  const lease: EscapementLease = {
    id: randomBase58(12),
    buyer,
    program: "counter-template",
    intervalMs: input.intervalMs,
    iterations: input.iterations,
    iterationsDone: 0,
    feePrepaidLamports: quoteLeaseLamports(input.iterations),
    feeSettledLamports: 0,
    status: "Active",
    createdAt: now,
    expiresAt: now + input.intervalMs * input.iterations + GRACE_MS,
  };
  update({ lease, ticks: [], receipt: null, isMinting: false });
}

export function fireTick(): void {
  const lease = state.lease;
  if (!lease || lease.status !== "Active") return;

  if (Date.now() > lease.expiresAt) {
    update({ lease: { ...lease, status: "Expired" } });
    return;
  }

  const failed = Math.random() < 0.03;
  const seq = lease.iterationsDone + 1;
  const tick: TickReceipt = {
    leaseId: lease.id,
    seq,
    success: !failed,
    at: Date.now(),
    errorCode: failed ? 6001 : undefined,
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
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const failed = Math.random() < SETTLE_FAIL_RATE;
  if (failed) {
    update({
      isSettling: false,
      error: "Settle failed on commit. Tick proof is intact — retry.",
      lease: {
        ...state.lease!,
        status:
          state.lease!.iterationsDone >= state.lease!.iterations
            ? "Exhausted"
            : "Active",
      },
    });
    return;
  }
  const settled = Math.round(
    (lease.iterationsDone / lease.iterations) * lease.feePrepaidLamports
  );
  const receipt: FeeSettleReceipt = {
    leaseId: lease.id,
    amountLamports: settled,
    txSig: randomBase58(88),
    committedAt: Date.now(),
  };
  update({
    isSettling: false,
    receipt,
    lease: { ...state.lease!, status: "Settled", feeSettledLamports: settled },
  });
}

export function clearLease(): void {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  state = { ...SERVER_STATE };
  listeners.forEach((l) => l());
}

export { PRICING };
