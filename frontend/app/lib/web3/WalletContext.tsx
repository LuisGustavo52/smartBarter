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

export type WalletStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error"
  | "unavailable";

/**
 * The account that will perform the transaction, once the blockchain
 * wallet has been linked to it. `address` and `chainId` come straight
 * from MetaMask; `linkedAt` marks the moment the link was established
 * for this session.
 */
export interface LinkedAccount {
  address: string;
  chainId: string;
  linkedAt: number;
}

interface WalletContextValue {
  status: WalletStatus;
  account: LinkedAccount | null;
  error: string | null;
  isMetaMaskInstalled: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

function toMessage(err: unknown): string {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: number }).code;
    if (code === 4001) return "Conexão recusada na MetaMask.";
    if (code === -32002)
      return "Já existe uma solicitação de conexão pendente na MetaMask.";
  }
  if (err instanceof Error) return err.message;
  return "Não foi possível conectar à carteira.";
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<WalletStatus>("idle");
  const [account, setAccount] = useState<LinkedAccount | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  // Vincula (ou atualiza) a conta local com os dados vindos da carteira.
  const linkAccount = useCallback((address: string, chainId: string) => {
    setAccount({ address, chainId, linkedAt: Date.now() });
    setStatus("connected");
    setError(null);
  }, []);

  const unlinkAccount = useCallback(() => {
    setAccount(null);
    setStatus("idle");
  }, []);

  // Detecta o provider e uma conexão já autorizada anteriormente.
  useEffect(() => {
    const provider = window.ethereum;
    if (!provider) {
      setIsMetaMaskInstalled(false);
      setStatus("unavailable");
      return;
    }
    setIsMetaMaskInstalled(true);

    (async () => {
      try {
        const accounts = (await provider.request({
          method: "eth_accounts",
        })) as string[];
        if (accounts.length > 0) {
          const chainId = (await provider.request({
            method: "eth_chainId",
          })) as string;
          linkAccount(accounts[0], chainId);
        }
      } catch {
        // Silencioso: apenas não havia sessão autorizada ainda.
      }
    })();

    const handleAccountsChanged = (...args: unknown[]) => {
      const accounts = args[0] as string[];
      if (accounts.length === 0) {
        unlinkAccount();
        return;
      }
      provider
        .request({ method: "eth_chainId" })
        .then((chainId) => linkAccount(accounts[0], chainId as string))
        .catch(() => unlinkAccount());
    };

    const handleChainChanged = (...args: unknown[]) => {
      const chainId = args[0] as string;
      setAccount((current) =>
        current ? { ...current, chainId } : current
      );
    };

    provider.on("accountsChanged", handleAccountsChanged);
    provider.on("chainChanged", handleChainChanged);

    return () => {
      provider.removeListener("accountsChanged", handleAccountsChanged);
      provider.removeListener("chainChanged", handleChainChanged);
    };
  }, [linkAccount, unlinkAccount]);

  const connect = useCallback(async () => {
    const provider = window.ethereum;
    if (!provider) {
      setStatus("unavailable");
      setError("MetaMask não foi encontrada neste navegador.");
      return;
    }

    setStatus("connecting");
    setError(null);
    try {
      const accounts = (await provider.request({
        method: "eth_requestAccounts",
      })) as string[];
      const chainId = (await provider.request({
        method: "eth_chainId",
      })) as string;
      linkAccount(accounts[0], chainId);
    } catch (err) {
      setStatus("error");
      setError(toMessage(err));
    }
  }, [linkAccount]);

  const disconnect = useCallback(() => {
    // A MetaMask não expõe uma desconexão programática via provider;
    // o que fazemos aqui é desvincular a conta desta sessão do app.
    unlinkAccount();
  }, [unlinkAccount]);

  const value = useMemo<WalletContextValue>(
    () => ({
      status,
      account,
      error,
      isMetaMaskInstalled,
      connect,
      disconnect,
    }),
    [status, account, error, isMetaMaskInstalled, connect, disconnect]
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet deve ser usado dentro de um WalletProvider.");
  }
  return ctx;
}
