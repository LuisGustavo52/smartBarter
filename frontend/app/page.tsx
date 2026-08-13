import { ConnectWalletButton } from "./components/ConnectWalletButton";
import { AccountLinkSeal } from "./components/AccountLinkSeal";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-[color:var(--background)]">
      <header className="flex items-center justify-between border-b border-[color:var(--surface-line)] px-6 py-5 sm:px-12">
        <span className="font-serif text-xl tracking-tight text-[color:var(--foreground)]">
          SmartBarter
        </span>
        <ConnectWalletButton />
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-20 sm:px-12">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.2em] text-[color:var(--accent-soft)]">
            Login Web3
          </p>
          <h1 className="mt-3 font-serif text-4xl leading-tight text-[color:var(--foreground)] sm:text-5xl">
            Toda troca começa com uma carteira conectada.
          </h1>
          <p className="mt-4 text-base leading-7 text-[color:var(--muted)]">
            Conecte sua MetaMask para vincular seu endereço on-chain à conta
            que vai propor e assinar as trocas no SmartBarter.
          </p>
        </div>

        <AccountLinkSeal />
      </main>
    </div>
  );
}
