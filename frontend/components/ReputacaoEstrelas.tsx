"use client";

import { useState, useEffect } from "react";
import { notify } from "@/lib/notify";

interface ReputacaoData {
  carteira: string;
  propostasAceitas: number;
  propostasRecusadas: number;
  cprsLiquidadas: number;
  scorePercentual: number | null;
  estrelas: number;
  classificacao: string;
}

interface ReputacaoEstrelas {
  carteira: string;
}

const CLASSIFICACAO_COLOR: Record<string, string> = {
  "Excelente": "text-emerald-600",
  "Confiável": "text-teal-600",
  "Regular": "text-amber-600",
  "Baixa Confiabilidade": "text-orange-600",
  "Risco Alto": "text-red-600",
  "Sem histórico": "text-gray-400",
};

export default function ReputacaoEstrelas({ carteira }: ReputacaoEstrelas) {
  const [reputacao, setReputacao] = useState<ReputacaoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!carteira) return;

    setIsLoading(true);
    fetch(`http://localhost:3001/reputacao/${carteira}`)
      .then((res) => {
        if (!res.ok) throw new Error("Erro ao buscar reputação");
        return res.json();
      })
      .then((data: ReputacaoData) => setReputacao(data))
      .catch((err) => {
        console.warn("Erro ao buscar reputação:", err);
        notify.error("Não foi possível carregar a reputação. Verifique a conexão.", "reputacao-error");
      })
      .finally(() => setIsLoading(false));
  }, [carteira]);

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-1 text-gray-300 text-sm animate-pulse">
        <span>★★★★★</span>
      </div>
    );
  }

  if (!reputacao) return null;

  const { estrelas, classificacao } = reputacao;
  const colorClass = CLASSIFICACAO_COLOR[classificacao] ?? "text-gray-500";

  return (
    <div className="inline-flex items-center gap-1.5" title={`Reputação: ${classificacao}${reputacao.scorePercentual !== null ? ` (${reputacao.scorePercentual}%)` : ""}`}>
      <span className="text-sm leading-none" aria-label={`${estrelas} de 5 estrelas`}>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            className={i < estrelas ? "text-amber-400" : "text-gray-200"}
            style={{ fontSize: "0.95em" }}
          >
            ★
          </span>
        ))}
      </span>
      <span className={`text-xs font-semibold ${colorClass}`}>
        {classificacao}
      </span>
    </div>
  );
}
