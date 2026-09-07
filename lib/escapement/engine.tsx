"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  EscapementLease,
  FeeSettleReceipt,
  TickReceipt,
} from "@/lib/escapement/types";
import { PRICING, quoteLeaseLamports } from "@/lib/escapement/pricing";
import { useWallet } from "@/lib/escapement/wallet-context";

const STORAGE_KEY = "escapement.lease.v1";
const GRACE_MS = 60_000;
const MAX_FEED = 10;

interface MintInput {
  intervalMs: number;
  iterations: number;
}

interface EngineValue {
  hydrated: boolean;
  lease: EscapementLease | null;
  ticks: TickReceipt[];
  receipt: FeeSettleReceipt | null;
  isMinting: boolean;
  isSettling: boolean;
  error: string | null;
  mintLease: (input: MintInput) => Promise<void>;
  settleFees: () => Promise<void>;
  clearLease: () => void;
}

const EngineContext = createContext<EngineValue | null>(null);

function randomBase58(length: number): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

interface PersistedState {
  lease: EscapementLease | null;
  ticks: TickReceipt[];
  receipt: FeeSettleReceipt | null;
}

function loadState(): PersistedState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { lease: null, ticks: [], receipt: null };
    return JSON.parse(raw) as PersistedState;
  } catch {
    return { lease: null, ticks: [], receipt: null };
  }
}

export function EngineProvider({ children }: { children: ReactNode }) {
  const [lease, setLease] = useState<EscapementLease | null>(null);
  const [ticks, setTicks] = useState<TickReceipt[]>([]);
  const [receipt, setReceipt] = useState<FeeSettleReceipt | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const { publicKey } = useWallet();
  const leaseRef = useRef<EscapementLease | null>(null);

  useEffect(() => {
    const saved = loadState();
    if (saved.lease) {
      if (
        saved.lease.status === "Active" &&
        Date.now() > saved.lease.expiresAt
      ) {
        saved.lease = { ...saved.lease, status: "Expired" };
      }
      setLease(saved.lease);
      leaseRef.current = saved.lease;
    }
    setTicks(saved.ticks);
    setReceipt(saved.receipt);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ lease, ticks, receipt })
      );
    } catch {
      // storage full or unavailable; state stays in memory
    }
  }, [hydrated, lease, ticks, receipt]);

  useEffect(() => {
    leaseRef.current = lease;
  }, [lease]);

  useEffect(() => {
    const current = leaseRef.current;
    if (!current || current.status !== "Active") return;

    const id = window.setInterval(() => {
      setLease((prev) => {
        if (!prev || prev.status !== "Active") return prev;

        if (Date.now() > prev.expiresAt) {
          return { ...prev, status: "Expired" };
        }

        const failed = Math.random() < 0.03;
        const seq = prev.iterationsDone + 1;
        const tick: TickReceipt = {
          leaseId: prev.id,
          seq,
          success: !failed,
          at: Date.now(),
          errorCode: failed ? 6001 : undefined,
        };
        setTicks((prevTicks) => [tick, ...prevTicks].slice(0, MAX_FEED));

        const next: EscapementLease = {
          ...prev,
          iterationsDone: seq,
          status: seq >= prev.iterations ? "Exhausted" : "Active",
        };
        return next;
      });
    }, current.intervalMs);

    return () => window.clearInterval(id);
  }, [lease?.status === "Active", lease?.intervalMs, lease?.id]);

  const mintLease = useCallback(
    async (input: MintInput) => {
      setError(null);
      setIsMinting(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 900));
        const now = Date.now();
        const next: EscapementLease = {
          id: randomBase58(12),
          buyer: publicKey ?? "unknown",
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
        setLease(next);
        setTicks([]);
        setReceipt(null);
      } catch {
        setError("Couldn't create the lease. Try again.");
      } finally {
        setIsMinting(false);
      }
    },
    [publicKey]
  );

  const settleFees = useCallback(async () => {
    const current = leaseRef.current;
    if (!current || current.iterationsDone === 0) return;
    setError(null);
    setIsSettling(true);
    setLease((prev) => (prev ? { ...prev, status: "Settling" } : prev));
    try {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const settled = current.iterationsDone * PRICING.perTickLamports;
      const r: FeeSettleReceipt = {
        leaseId: current.id,
        amountLamports: settled,
        txSig: randomBase58(88),
        committedAt: Date.now(),
      };
      setReceipt(r);
      setLease((prev) =>
        prev
          ? {
              ...prev,
              status: "Settled",
              feeSettledLamports: settled,
            }
          : prev
      );
    } catch {
      setError("Settle failed on commit. The tick proof is intact — retry.");
      setLease((prev) =>
        prev && prev.status === "Settling"
          ? { ...prev, status: current.iterationsDone >= current.iterations ? "Exhausted" : "Active" }
          : prev
      );
    } finally {
      setIsSettling(false);
    }
  }, []);

  const clearLease = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setLease(null);
    setTicks([]);
    setReceipt(null);
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      lease,
      ticks,
      receipt,
      isMinting,
      isSettling,
      error,
      mintLease,
      settleFees,
      clearLease,
    }),
    [
      hydrated,
      lease,
      ticks,
      receipt,
      isMinting,
      isSettling,
      error,
      mintLease,
      settleFees,
      clearLease,
    ]
  );

  return <EngineContext.Provider value={value}>{children}</EngineContext.Provider>;
}

export function useEscapement(): EngineValue {
  const ctx = useContext(EngineContext);
  if (!ctx) throw new Error("useEscapement must be used within EngineProvider");
  return ctx;
}
