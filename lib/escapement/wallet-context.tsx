"use client";

import {
  useCallback,
  useSyncExternalStore,
  useState,
} from "react";

const KEY = "escapement.wallet";
const listeners = new Set<() => void>();
let cache: string | null | undefined;

function read(): string | null {
  if (typeof window === "undefined") return null;
  if (cache === undefined) cache = window.sessionStorage.getItem(KEY);
  return cache;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useWallet() {
  const publicKey = useSyncExternalStore(
    subscribe,
    read,
    () => null
  );
  const [connecting, setConnecting] = useState(false);

  const connect = useCallback(async () => {
    setConnecting(true);
    await new Promise((resolve) => setTimeout(resolve, 600));
    const alphabet = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
    let key = "";
    for (let i = 0; i < 44; i++) {
      key += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    cache = key;
    window.sessionStorage.setItem(KEY, key);
    listeners.forEach((l) => l());
    setConnecting(false);
  }, []);

  const disconnect = useCallback(() => {
    cache = null;
    window.sessionStorage.removeItem(KEY);
    listeners.forEach((l) => l());
  }, []);

  const state = publicKey
    ? "connected"
    : connecting
      ? "connecting"
      : "disconnected";

  return { state, publicKey, connect, disconnect };
}
