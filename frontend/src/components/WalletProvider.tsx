/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { connectFreighter, restoreFreighterSession, type WalletSession } from "../lib/wallet";

type WalletContextValue = {
  session: WalletSession | null;
  connecting: boolean;
  connect: () => Promise<WalletSession>;
  disconnect: () => void;
};

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<WalletSession | null>(null);
  const [connecting, setConnecting] = useState(false);
  useEffect(() => { void restoreFreighterSession().then(setSession); }, []);
  const connect = useCallback(async () => {
    setConnecting(true);
    try {
      const connected = await connectFreighter();
      setSession(connected);
      return connected;
    } finally { setConnecting(false); }
  }, []);
  const value = useMemo(() => ({ session, connecting, connect, disconnect: () => setSession(null) }), [session, connecting, connect]);
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const value = useContext(WalletContext);
  if (!value) throw new Error("useWallet must be used inside WalletProvider");
  return value;
}
