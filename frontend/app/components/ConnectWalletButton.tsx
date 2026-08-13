"use client";

import { useWallet } from "../lib/web3/WalletContext";
import { truncateAddress } from "../lib/web3/format";

export function ConnectWalletButton() {
  const { status, account, error, isMetaMaskInstalled, connect, disconnect } =
    useWallet();

  if (status === "connected" && account) {
    return (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-2 rounded-full border border-[color:var(--accent)]/40 bg-[color:var(--surface)] px-4 py-2 font-mono text-sm text-[color:var(--accent-soft)]">
          <span className="h-2 w-2 rounded-full bg-[color:var(--accent)] shadow-[0_0_8px_var(--accent)]" />
          {truncateAddress(account.address)}
        </span>
        <button
          type="button"
          onClick={disconnect}
          className="rounded-full px-3 py-2 text-sm text-[color:var(--muted)] transition-colors hover:text-[color:var(--foreground)]"
        >
          Desconectar
        </button>
      </div>
    );
  }

  if (!isMetaMaskInstalled && status === "unavailable") {
    return (
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <a
          href="https://metamask.io/download/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full bg-[color:var(--accent)] px-6 py-3 font-medium text-[#10201B] transition-transform hover:-translate-y-0.5"
        >
          Instalar MetaMask
        </a>
        <span className="text-xs text-[color:var(--muted)]">
          MetaMask não encontrada neste navegador.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={connect}
        disabled={status === "connecting"}
        className="rounded-full bg-[color:var(--accent)] px-6 py-3 font-medium text-[#10201B] transition-transform hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70"
      >
        {status === "connecting" ? "Conectando…" : "Conectar Carteira"}
      </button>
      {error && (
        <span className="max-w-xs text-right text-xs text-[color:var(--danger)]">
          {error}
        </span>
      )}
    </div>
  );
}
