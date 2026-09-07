"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type WalletState = "disconnected" | "connecting" | "connected";

interface WalletContextValue {
  state: WalletState;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

function randomBase58(length: number): string {
  const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>("disconnected");
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("escapement.wallet");
    if (saved) {
      setPublicKey(saved);
      setState("connected");
    }
  }, []);

  const connect = useCallback(async () => {
    setState("connecting");
    await new Promise((resolve) => setTimeout(resolve, 600));
    const key = window.sessionStorage.getItem("escapement.wallet") ?? randomBase58(44);
    window.sessionStorage.setItem("escapement.wallet", key);
    setPublicKey(key);
    setState("connected");
  }, []);

  const disconnect = useCallback(() => {
    window.sessionStorage.removeItem("escapement.wallet");
    setPublicKey(null);
    setState("disconnected");
  }, []);

  const value = useMemo(
    () => ({ state, publicKey, connect, disconnect }),
    [state, publicKey, connect, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
