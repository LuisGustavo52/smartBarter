"use client";

import { useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { notify } from "@/lib/notify";

interface Props {
  assetId: string;
  fornecedorWallet: string;
  precoSacas: number;
  unidadeMedida?: string;
}

export default function BotaoAssinarAcordo({
  assetId,
  fornecedorWallet,
  precoSacas,
  unidadeMedida = "unidade",
}: Props) {
  const account = useActiveAccount();
  const [quantidade, setQuantidade] = useState("1");
  const [safra, setSafra] = useState("");
  const [tipoCafe, setTipoCafe] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  // pré-visualização; o valor oficial é da API
  function calcularPrevia(qtd: number, preco: number): { total: number; sacasCpr: number } | null {
    if (!Number.isFinite(qtd) || qtd <= 0 || !Number.isFinite(preco) || preco <= 0) {
      return null;
    }
    const total = Number((qtd * preco).toFixed(4));
    const sacasCpr = Math.ceil(total);
    if (total <= 0) return null;
    return { total, sacasCpr };
  }

  const previa = calcularPrevia(Number(quantidade), precoSacas);

  const enviarProposta = async () => {
    if (!account) {
      notify.error("Conecte sua carteira primeiro.");
      return;
    }
    const quantidadeComprada = Number(quantidade);
    if (!Number.isFinite(quantidadeComprada) || quantidadeComprada <= 0 || !safra || !tipoCafe) {
      notify.error("Informe quantidade, safra e tipo de café.");
      return;
    }

    let toastId: string | undefined;
    try {
      setPending(true);
      toastId = notify.loading("Enviando proposta ao fornecedor...");
      const response = await fetch("http://localhost:3001/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtorWallet: account.address,
          fornecedorWallet,
          assetId,
          quantidadeComprada,
          safra,
          tipoCafe,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? "Não foi possível enviar a proposta.");
      setSuccess(true);
      const mensagemSucesso =
        body?.sacas_cpr != null
          ? `Proposta enviada: ${body.sacas_cpr} sacas na CPR.`
          : "Proposta enviada ao fornecedor.";
      notify.success(mensagemSucesso, toastId);
    } catch (error) {
      notify.fromError(error, toastId);
    } finally {
      setPending(false);
    }
  };

  if (success) {
    return <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-700">Proposta enviada e aguardando resposta.</div>;
  }

  return (
    <div className="w-full space-y-3 rounded-2xl border border-gray-100 bg-gray-50 p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input type="number" min="0.000001" step="any" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="Quantidade" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900" />
        <input value={safra} onChange={(e) => setSafra(e.target.value)} placeholder="Safra (2026/2027)" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900" />
        <input value={tipoCafe} onChange={(e) => setTipoCafe(e.target.value)} placeholder="Tipo de café" className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900" />
      </div>

      {previa && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-950 space-y-0.5">
          <p className="font-medium">
            {Number(quantidade).toLocaleString("pt-BR")} {unidadeMedida} × {precoSacas.toLocaleString("pt-BR")} sacas ={" "}
            <span className="font-bold">{previa.total.toLocaleString("pt-BR")} sacas</span>
          </p>
          {previa.sacasCpr !== previa.total && (
            <p className="text-emerald-700">
              Será registrado na CPR:{" "}
              <span className="font-bold">{previa.sacasCpr.toLocaleString("pt-BR")} sacas</span> (arredondado para cima)
            </p>
          )}
        </div>
      )}

      <button onClick={enviarProposta} disabled={pending || !account || !previa} className="w-full rounded-xl bg-emerald-900 px-5 py-3 font-bold text-white hover:bg-emerald-950 disabled:cursor-wait disabled:opacity-70">
        {pending ? "Enviando..." : `Fazer proposta (${precoSacas} sacas por ${unidadeMedida})`}
      </button>
    </div>
  );
}
