"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useActiveAccount, useActiveWalletConnectionStatus } from "thirdweb/react";
import { notify } from "@/lib/notify";

type Verificacao = "verificando" | "liberado" | "nao_cadastrado" | "falha";

function Carregando({ texto }: { texto: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      <p className="text-emerald-700 font-medium">{texto}</p>
    </div>
  );
}

export default function HubGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const account = useActiveAccount();
  const status = useActiveWalletConnectionStatus();
  const [verificacao, setVerificacao] = useState<Verificacao>("verificando");
  const [retry, setRetry] = useState(0);
  const endereco = account?.address;

  // 1) Sem carteira: volta ao login. Espera o AutoConnect terminar para não expulsar quem só recarregou a página.
  useEffect(() => {
    if (endereco || status === "connecting") return;
    const espera = status === "disconnected" ? 0 : 3000;
    const t = setTimeout(() => {
      notify.error("Conecte sua carteira para entrar no sistema.", "hub-guard");
      router.replace("/cadastro");
    }, espera);
    return () => clearTimeout(t);
  }, [endereco, status, router]);

  // 2) Com carteira: confere se existe cadastro
  useEffect(() => {
    if (!endereco) return;
    let ativo = true;
    setVerificacao("verificando");

    fetch(`http://localhost:3001/users/wallet/${endereco}`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro na API");
        return res.json();
      })
      .then((data) => {
        if (!ativo) return;
        if (data?.exists) {
          setVerificacao("liberado");
        } else {
          setVerificacao("nao_cadastrado");
          notify.error("Complete seu cadastro para entrar no sistema.", "hub-guard");
          router.replace("/cadastro");
        }
      })
      .catch((err) => {
        if (!ativo) return;
        console.warn("HubGuard: falha ao verificar o cadastro:", err);
        notify.error("Não foi possível verificar sua identidade. Verifique a conexão.", "hub-guard-verify");
        setVerificacao("falha");
      });

    return () => {
      ativo = false;
    };
  }, [endereco, retry, router]);

  if (!endereco) return <Carregando texto="Verificando sua carteira..." />;
  if (verificacao === "verificando" || verificacao === "nao_cadastrado") {
    return <Carregando texto="Verificando sua identidade..." />;
  }
  if (verificacao === "falha") {
    return (
      <div className="max-w-xl mx-auto mt-16 bg-amber-50 border border-amber-200 text-amber-800 p-8 rounded-3xl text-center">
        <p className="font-semibold text-lg mb-4">Não foi possível verificar sua identidade no sistema.</p>
        <div className="flex justify-center gap-3">
          <button
            onClick={() => setRetry((r) => r + 1)}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-all shadow-md"
          >
            Tentar novamente
          </button>
          <button
            onClick={() => router.replace("/cadastro")}
            className="px-6 py-2 text-amber-800 font-semibold hover:bg-amber-100 rounded-xl transition-colors"
          >
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
