"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

interface RawProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  isBackpack?: boolean;
  publicKey?: { toString(): string } | null;
  isConnected?: boolean;
  connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toString(): string } }>;
  disconnect(): Promise<void>;
  signAndSendTransaction(
    transaction: unknown
  ): Promise<{ signature: string }>;
  on?(event: "accountChanged" | "disconnect", handler: (...args: unknown[]) => void): void;
  removeListener?(event: "accountChanged" | "disconnect", handler: (...args: unknown[]) => void): void;
}

export interface InjectedWallet {
  name: string;
  installUrl: string;
  provider: RawProvider;
}

function detectWallets(): InjectedWallet[] {
  const w = window as unknown as Record<string, unknown>;
  const wallets: InjectedWallet[] = [];
  const phantom = (w.phantom as { solana?: RawProvider } | undefined)?.solana;
  if (phantom) {
    wallets.push({ name: "Phantom", installUrl: "https://phantom.app/download", provider: phantom });
  }
  const solflare = w.solflare as RawProvider | undefined;
  if (solflare) {
    wallets.push({ name: "Solflare", installUrl: "https://solflare.com/download", provider: solflare });
  }
  const backpack = w.backpack as RawProvider | undefined;
  if (backpack) {
    wallets.push({ name: "Backpack", installUrl: "https://backpack.app/downloads", provider: backpack });
  }
  const generic = w.solana as RawProvider | undefined;
  if (generic && generic !== phantom && !wallets.some((x) => x.provider === generic)) {
    wallets.push({ name: "Solana wallet", installUrl: "https://solana.com/wallets", provider: generic });
  }
  return wallets;
}

const walletListeners = new Set<() => void>();
let cachedWallets: InjectedWallet[] | null = null;

function getWalletsSnapshot(): InjectedWallet[] {
  if (typeof window === "undefined") return [];
  if (!cachedWallets) cachedWallets = detectWallets();
  return cachedWallets;
}

function subscribeWallets(listener: () => void) {
  walletListeners.add(listener);
  return () => {
    walletListeners.delete(listener);
  };
}

if (typeof window !== "undefined") {
  const refresh = () => {
    cachedWallets = null;
    walletListeners.forEach((l) => l());
  };
  if (document.readyState === "complete") {
    // Extensions may still inject providers asynchronously; poll briefly.
    let checks = 0;
    const id = window.setInterval(() => {
      checks += 1;
      if (cachedWallets && cachedWallets.length > 0) {
        window.clearInterval(id);
        return;
      }
      if (checks > 20) {
        window.clearInterval(id);
        return;
      }
      refresh();
    }, 250);
  } else {
    window.addEventListener("load", refresh);
  }
}

const EMPTY_WALLETS: InjectedWallet[] = [];

function useDetectedWallets(): InjectedWallet[] {
  return useSyncExternalStore(subscribeWallets, getWalletsSnapshot, () => EMPTY_WALLETS);
}

type WalletState = "disconnected" | "connecting" | "connected";

interface WalletContextValue {
  state: WalletState;
  publicKey: string | null;
  walletName: string | null;
  wallets: InjectedWallet[];
  error: string | null;
  connect: (wallet?: InjectedWallet) => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const LAST_WALLET_KEY = "escapement.walletName";

let activeProvider: RawProvider | null = null;

export function getActiveProvider(): RawProvider | null {
  return activeProvider;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const wallets = useDetectedWallets();
  const [state, setState] = useState<WalletState>("disconnected");
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDisconnectEvent = useCallback(() => {
    setPublicKey(null);
    setWalletName(null);
    setState("disconnected");
  }, []);

  const handleAccountChanged = useCallback((...args: unknown[]) => {
    const next = args[0] as { toString(): string } | null | undefined;
    if (!next) {
      setPublicKey(null);
      setWalletName(null);
      setState("disconnected");
      return;
    }
    setPublicKey(next.toString());
  }, []);

  const restoreRan = useRef(false);
  useEffect(() => {
    if (restoreRan.current || wallets.length === 0) return;
    restoreRan.current = true;

    const preferredName = window.sessionStorage.getItem(LAST_WALLET_KEY);
    const preferred =
      wallets.find((x) => x.name === preferredName) ?? wallets[0];
    let cancelled = false;
    async function restore() {
      try {
        const res = await preferred.provider.connect({ onlyIfTrusted: true });
        if (cancelled) return;
        activeProvider = preferred.provider;
        activeProvider.on?.("disconnect", handleDisconnectEvent);
        activeProvider.on?.("accountChanged", handleAccountChanged);
        setPublicKey(res.publicKey.toString());
        setWalletName(preferred.name);
        setState("connected");
      } catch {
        // Trusted-connection restore is best-effort; stay disconnected.
      }
    }
    void restore();
    return () => {
      cancelled = true;
    };
  }, [wallets, handleDisconnectEvent, handleAccountChanged]);

  const connect = useCallback(
    async (wallet?: InjectedWallet) => {
      const target =
        wallet ??
        wallets.find((x) => x.name === window.sessionStorage.getItem(LAST_WALLET_KEY)) ??
        wallets[0];
      if (!target) {
        setError("No Solana wallet detected — install Phantom to continue.");
        return;
      }
      setError(null);
      setState("connecting");
      // A dismissed wallet popup can leave the promise unresolved forever;
      // give up rather than spinning "Connecting…" indefinitely.
      const timeout = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error("Wallet took too long to connect. Try again.")),
          30_000
        );
      });
      try {
        const res = await Promise.race([target.provider.connect(), timeout]);
        if (activeProvider && activeProvider !== target.provider) {
          activeProvider.removeListener?.("disconnect", handleDisconnectEvent);
          activeProvider.removeListener?.("accountChanged", handleAccountChanged);
        }
        activeProvider = target.provider;
        activeProvider.on?.("disconnect", handleDisconnectEvent);
        activeProvider.on?.("accountChanged", handleAccountChanged);
        window.sessionStorage.setItem(LAST_WALLET_KEY, target.name);
        setPublicKey(res.publicKey.toString());
        setWalletName(target.name);
        setState("connected");
      } catch (err) {
        setState("disconnected");
        setError(
          err instanceof Error
            ? /reject/i.test(err.message)
              ? "Wallet request was rejected."
              : err.message
            : "Wallet connection failed."
        );
      }
    },
    [wallets, handleDisconnectEvent, handleAccountChanged]
  );

  const disconnect = useCallback(async () => {
    setError(null);
    try {
      await activeProvider?.disconnect();
    } catch {
      // Provider may already be gone; local state is cleared regardless.
    }
    activeProvider = null;
    window.sessionStorage.removeItem(LAST_WALLET_KEY);
    setPublicKey(null);
    setWalletName(null);
    setState("disconnected");
  }, []);

  const value = useMemo(
    () => ({ state, publicKey, walletName, wallets, error, connect, disconnect }),
    [state, publicKey, walletName, wallets, error, connect, disconnect]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
