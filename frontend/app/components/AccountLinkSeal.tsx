"use client";

import { useWallet } from "../lib/web3/WalletContext";
import { chainLabel, truncateAddress } from "../lib/web3/format";

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function AccountLinkSeal() {
  const { status, account } = useWallet();
  const linked = status === "connected" && account;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-[color:var(--surface-line)] bg-[color:var(--surface)] p-8">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--muted)]">
            Conta de transação
          </p>
          <h3 className="mt-2 font-serif text-2xl text-[color:var(--foreground)]">
            {linked ? "Carteira vinculada" : "Nenhuma carteira vinculada"}
          </h3>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[color:var(--muted)]">
            {linked
              ? "Os dados da sua carteira estão vinculados à conta que assinará as trocas nesta sessão."
              : "Conecte a MetaMask para vincular o endereço que vai assinar as trocas do SmartBarter."}
          </p>
        </div>

        {/* Selo: o elemento de assinatura visual — um "selo de barganha" que
            estampa a ligação entre carteira e conta assim que ela ocorre. */}
        <div
          aria-hidden
          className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-500 ${
            linked
              ? "border-[color:var(--accent)] rotate-0 opacity-100"
              : "border-dashed border-[color:var(--surface-line)] -rotate-12 opacity-50"
          }`}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-8 w-8 transition-colors ${
              linked ? "text-[color:var(--accent)]" : "text-[color:var(--muted)]"
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path
              d="M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0Z"
              strokeLinecap="round"
            />
            <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {linked && account && (
        <dl className="mt-8 grid grid-cols-2 gap-6 border-t border-[color:var(--surface-line)] pt-6 font-mono text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
              Endereço
            </dt>
            <dd className="mt-1 text-[color:var(--foreground)]">
              {truncateAddress(account.address)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
              Rede
            </dt>
            <dd className="mt-1 text-[color:var(--foreground)]">
              {chainLabel(account.chainId)}
            </dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs uppercase tracking-wide text-[color:var(--muted)]">
              Vinculada às
            </dt>
            <dd className="mt-1 text-[color:var(--foreground)]">
              {formatTime(account.linkedAt)}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}
