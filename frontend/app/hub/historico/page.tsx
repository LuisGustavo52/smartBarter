"use client";

import { useEffect, useState, useMemo } from "react";
import { useActiveAccount } from "thirdweb/react";
import { API_BASE_URL } from "@/lib/config";
import { notify } from "@/lib/notify";
import UsuarioDisplay from "@/components/UsuarioDisplay";
import {
  HistoricoItem,
  EVENTO_LABELS,
  agruparPorCiclo,
  encurtar,
  extrairResumoCiclo,
} from "@/lib/historico";

function formatarDataHora(isoString: string): string {
  try {
    const data = new Date(isoString);
    if (isNaN(data.getTime())) return isoString;
    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return isoString;
  }
}

export default function HistoricoPage() {
  const account = useActiveAccount();
  const wallet = account?.address;

  const [itens, setItens] = useState<HistoricoItem[]>([]);
  const [filtroEvento, setFiltroEvento] = useState<string>("");
  const [carregando, setCarregando] = useState<boolean>(true);
  const [carregandoMais, setCarregandoMais] = useState<boolean>(false);
  const [ultimoLoteTamanho, setUltimoLoteTamanho] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);

  useEffect(() => {
    if (!wallet) return;
    let cancelado = false;

    async function buscar() {
      try {
        const query = new URLSearchParams({
          wallet: wallet!,
          limit: "100",
          offset: "0",
        });
        if (filtroEvento) {
          query.set("evento", filtroEvento);
        }

        const res = await fetch(`${API_BASE_URL}/historico?${query.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.message ?? "Falha ao consultar histórico de transações.");
        }

        const data: HistoricoItem[] = await res.json();
        if (!cancelado) {
          setItens(data);
          setOffset(0);
          setUltimoLoteTamanho(data.length);
        }
      } catch (err) {
        if (!cancelado) {
          console.warn("Erro ao buscar histórico:", err);
          notify.fromError(err, "historico-fetch");
        }
      } finally {
        if (!cancelado) {
          setCarregando(false);
        }
      }
    }

    buscar();

    return () => {
      cancelado = true;
    };
  }, [wallet, filtroEvento]);

  const carregarMais = async () => {
    if (!wallet || carregandoMais) return;
    const proximoOffset = offset + 100;
    setCarregandoMais(true);

    try {
      const query = new URLSearchParams({
        wallet,
        limit: "100",
        offset: String(proximoOffset),
      });
      if (filtroEvento) {
        query.set("evento", filtroEvento);
      }

      const res = await fetch(`${API_BASE_URL}/historico?${query.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.message ?? "Falha ao carregar próximo lote de histórico.");
      }

      const novosItens: HistoricoItem[] = await res.json();
      setItens((prev) => [...prev, ...novosItens]);
      setOffset(proximoOffset);
      setUltimoLoteTamanho(novosItens.length);
    } catch (err) {
      console.warn("Erro ao carregar mais eventos do histórico:", err);
      notify.fromError(err, "historico-fetch");
    } finally {
      setCarregandoMais(false);
    }
  };

  const ciclos = useMemo(() => agruparPorCiclo(itens), [itens]);

  if (!account) {
    return (
      <div className="mx-auto max-w-6xl p-12 text-center">
        <h1 className="text-2xl font-bold">
          Conecte sua carteira para acessar o histórico de transações.
        </h1>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-12">
      <header className="rounded-3xl bg-[#0A1A14] p-8 text-white">
        <h1 className="text-3xl font-serif font-bold">Histórico de transações</h1>
        <p className="mt-2 text-emerald-100/80">
          Os registros ficam salvos no banco de dados e são preservados mesmo se a blockchain local for reiniciada.
        </p>
        <div className="mt-3">
          <UsuarioDisplay address={account.address} showIcon={false} />
        </div>
      </header>

      {/* Barra de Filtro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-white p-4 border border-emerald-100/60 shadow-xs">
        <label htmlFor="filtro-evento" className="text-sm font-semibold text-gray-700">
          Filtrar por evento:
        </label>
        <select
          id="filtro-evento"
          value={filtroEvento}
          onChange={(e) => {
            setFiltroEvento(e.target.value);
            setCarregando(true);
          }}
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm text-gray-800 shadow-xs focus:border-emerald-500 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
        >
          <option value="">Todos</option>
          <option value="PROPOSTA_CRIADA">Proposta criada</option>
          <option value="PROPOSTA_ACEITA">Proposta aceita</option>
          <option value="PROPOSTA_RECUSADA">Proposta recusada</option>
          <option value="CPR_EMITIDA">CPR emitida</option>
          <option value="ENTREGA_CONFIRMADA">Entrega confirmada</option>
          <option value="CPR_LIQUIDADA">CPR liquidada</option>
        </select>
      </div>

      {/* Estado: Carregando */}
      {carregando && (
        <div className="py-12 text-center text-gray-500">
          <p className="text-base font-medium">Carregando histórico...</p>
        </div>
      )}

      {/* Estado: Vazio */}
      {!carregando && itens.length === 0 && (
        <div className="rounded-3xl border border-dashed border-gray-300 p-12 text-center text-gray-500">
          <p className="text-base">Nenhum evento registrado para esta carteira ainda.</p>
        </div>
      )}

      {/* Lista de cartões, um por ciclo */}
      {!carregando && ciclos.length > 0 && (
        <div className="space-y-6">
          {ciclos.map((ciclo) => {
            const resumo = extrairResumoCiclo(ciclo, wallet);
            const itensResumo = [
              resumo.quantidade,
              resumo.safra ? `Safra ${resumo.safra}` : null,
              resumo.sacas ? `${resumo.sacas} sacas` : null,
            ].filter(Boolean);

            return (
              <article
                key={ciclo.id}
                className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-xs space-y-6"
              >
                {/* Cabeçalho do Cartão de Ciclo */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {resumo.insumo || ciclo.titulo}
                    </h2>
                    {itensResumo.length > 0 && (
                      <p className="mt-1 text-sm text-gray-600">
                        {itensResumo.join(" · ")}
                      </p>
                    )}
                  </div>

                  {resumo.papelUsuario && (
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        resumo.papelUsuario === "Produtor"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      Você é: {resumo.papelUsuario}
                    </span>
                  )}
                </div>

                {/* Linha do Tempo dentro do Cartão */}
                <div className="relative border-l-2 border-emerald-200 ml-3 pl-6 space-y-6">
                  {ciclo.itens.map((item) => (
                    <div key={item.id} className="relative">
                      {/* Marcador na linha */}
                      <div className="absolute -left-[31px] top-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-600 shadow-xs" />

                      {/* Linha principal com rótulo, data e selos */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-gray-900">
                          {EVENTO_LABELS[item.evento] ?? item.evento}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatarDataHora(item.ocorrido_em)}
                        </span>
                        {item.token_id !== null && item.token_id !== undefined && (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                            Token #{item.token_id.toString()}
                          </span>
                        )}
                        {item.chain_epoch && (
                          <span className="rounded-md bg-gray-100 px-2 py-0.5 font-mono text-xs text-gray-700 border border-gray-200">
                            chain {item.chain_epoch.slice(0, 10)}
                          </span>
                        )}
                        <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 border border-gray-200">
                          {item.ambiente}
                        </span>
                      </div>

                      {/* Metadados: Ator e Hash */}
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-gray-600">
                        {item.ator_wallet && (
                          <span title={item.ator_wallet}>
                            Ator: <span className="font-mono">{encurtar(item.ator_wallet)}</span>
                          </span>
                        )}
                        {item.tx_hash && (
                          <span title={item.tx_hash} className="font-mono text-gray-500">
                            Tx: {encurtar(item.tx_hash)}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Botão Carregar mais */}
      {!carregando && ultimoLoteTamanho === 100 && (
        <div className="flex justify-center pt-4">
          <button
            onClick={carregarMais}
            disabled={carregandoMais}
            className="rounded-xl bg-emerald-700 px-6 py-2.5 font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-60 transition-colors"
          >
            {carregandoMais ? "Carregando..." : "Carregar mais"}
          </button>
        </div>
      )}
    </div>
  );
}
