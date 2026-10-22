"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import toast from "react-hot-toast";
import { useActiveAccount } from "thirdweb/react";
import { createThirdwebClient, getContract } from "thirdweb";
import { smartBarterLocalChain } from "@/lib/smartBarterChain";
import { carregarCprs, Cpr } from "@/lib/cprs";
import { CONTRACT_ADDRESS } from "@/lib/config";
import BotaoLiquidarCPR from "@/components/BotaoLiquidarCPR";
import UsuarioDisplay from "@/components/UsuarioDisplay";
import { notify } from "@/lib/notify";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "d3690d56bdafa6a3cd84d948259dbbe0",
});

const myContract = getContract({
  client,
  chain: smartBarterLocalChain,
  address: CONTRACT_ADDRESS,
});

interface Insumo {
  id: string;
  nome: string;
  descricao: string;
  preco_sacas: number;
  unidade_medida: string;
  fornecedor_wallet: string;
  created_at: string;
}

export default function MeusAtivosPage() {
  const account = useActiveAccount();
  const [montado, setMontado] = useState(false);

  // Perfil
  const [tipoUsuario, setTipoUsuario] = useState<string | null>(null);
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);

  // Insumos (Fornecedor)
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [carregandoInsumos, setCarregandoInsumos] = useState(false);
  const [erroInsumos, setErroInsumos] = useState("");

  // Modal de Edição de Insumo
  const [insumoEditando, setInsumoEditando] = useState<Insumo | null>(null);
  const [formEdit, setFormEdit] = useState({
    nome: "",
    descricao: "",
    precoSacas: "",
    unidadeMedida: "",
  });
  const [salvandoInsumo, setSalvandoInsumo] = useState(false);

  // CPRs On-chain
  const [cprs, setCprs] = useState<Cpr[]>([]);
  const [carregandoCprs, setCarregandoCprs] = useState(false);
  const [erroCprs, setErroCprs] = useState("");

  // Dados de Mercado
  const [marketData, setMarketData] = useState<any>(null);
  const [marketError, setMarketError] = useState("");

  useEffect(() => {
    setMontado(true);
  }, []);

  // Busca perfil do usuário
  useEffect(() => {
    async function fetchPerfil() {
      if (!account?.address) {
        setCarregandoPerfil(false);
        setTipoUsuario(null);
        return;
      }
      setCarregandoPerfil(true);
      try {
        const res = await fetch(`http://localhost:3001/users/wallet/${account.address}`);
        const payload = res.ok ? await res.json() : null;
        setTipoUsuario(payload?.user?.tipo_usuario?.toUpperCase() ?? null);
      } catch (err) {
        console.warn("Erro ao buscar perfil do usuário:", err);
        setTipoUsuario(null);
      } finally {
        setCarregandoPerfil(false);
      }
    }
    fetchPerfil();
  }, [account?.address]);

  // Busca dados de mercado
  useEffect(() => {
    async function fetchMarket() {
      try {
        const res = await fetch("http://localhost:3001/market/cafe");
        if (!res.ok) throw new Error("Cotação indisponível");
        const data = await res.json();
        setMarketData(data);
      } catch (err: any) {
        console.warn("Erro ao carregar dados de cotação do café:", err);
        setMarketError("Cotação indisponível no momento");
      }
    }
    fetchMarket();
  }, []);

  // Busca insumos do fornecedor
  const fetchInsumos = useCallback(async () => {
    if (!account?.address || tipoUsuario !== "FORNECEDOR") {
      setInsumos([]);
      setCarregandoInsumos(false);
      return;
    }
    setCarregandoInsumos(true);
    setErroInsumos("");
    try {
      const res = await fetch(`http://localhost:3001/assets/wallet/${account.address}`);
      if (!res.ok) throw new Error("Erro ao buscar seus insumos.");
      const data = await res.json();
      setInsumos(data);
    } catch (err: any) {
      console.warn("Erro ao buscar insumos do fornecedor:", err);
      notify.error("Não foi possível carregar os insumos.", "ativos-error");
      setErroInsumos("Não foi possível carregar seus insumos.");
    } finally {
      setCarregandoInsumos(false);
    }
  }, [account?.address, tipoUsuario]);

  useEffect(() => {
    if (tipoUsuario === "FORNECEDOR") {
      fetchInsumos();
    }
  }, [tipoUsuario, fetchInsumos]);

  // Busca CPRs on-chain
  const fetchCprs = useCallback(async () => {
    if (!account?.address) {
      setCprs([]);
      setCarregandoCprs(false);
      return;
    }
    setCarregandoCprs(true);
    setErroCprs("");
    try {
      const lista = await carregarCprs(myContract, account.address);
      setCprs(lista);
    } catch (err: any) {
      console.warn("Erro ao buscar CPRs on-chain:", err);
      notify.error("Não foi possível carregar as CPRs.", "cprs-onchain-error");
      setErroCprs("Não foi possível carregar suas CPRs.");
    } finally {
      setCarregandoCprs(false);
    }
  }, [account?.address]);

  useEffect(() => {
    fetchCprs();
  }, [fetchCprs]);

  // Ações de Insumo (Editar)
  const abrirEdicao = (insumo: Insumo) => {
    setInsumoEditando(insumo);
    setFormEdit({
      nome: insumo.nome,
      descricao: insumo.descricao,
      precoSacas: String(insumo.preco_sacas),
      unidadeMedida: insumo.unidade_medida,
    });
  };

  const fecharEdicao = () => {
    if (salvandoInsumo) return;
    setInsumoEditando(null);
  };

  useEffect(() => {
    if (!insumoEditando) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !salvandoInsumo) {
        setInsumoEditando(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [insumoEditando, salvandoInsumo]);

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account?.address || !insumoEditando) return;

    const preco = Number(formEdit.precoSacas);
    if (
      !formEdit.nome.trim() ||
      !formEdit.descricao.trim() ||
      !formEdit.unidadeMedida.trim() ||
      !Number.isFinite(preco) ||
      preco <= 0
    ) {
      notify.error("Preencha todos os campos corretamente com preço maior que zero.");
      return;
    }

    let toastId: string | undefined;
    try {
      setSalvandoInsumo(true);
      toastId = notify.loading("Salvando insumo...");

      const res = await fetch(`http://localhost:3001/assets/${insumoEditando.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fornecedorWallet: account.address,
          nome: formEdit.nome.trim(),
          descricao: formEdit.descricao.trim(),
          precoSacas: preco,
          unidadeMedida: formEdit.unidadeMedida.trim().slice(0, 40),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = Array.isArray(errData.message)
          ? errData.message.join(" ")
          : errData.message || "Erro ao atualizar insumo.";
        throw Object.assign(new Error(msg), { userMessage: msg });
      }

      notify.success("Insumo atualizado.", toastId);
      setInsumoEditando(null);
      await fetchInsumos();
    } catch (err: any) {
      notify.fromError(err, toastId);
    } finally {
      setSalvandoInsumo(false);
    }
  };

  // Ações de Insumo (Remover)
  const confirmarRemocao = (insumo: Insumo) => {
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible
              ? "animate-in fade-in zoom-in-95 duration-200"
              : "animate-out fade-out zoom-out-95 duration-150"
          } max-w-sm w-full bg-white shadow-2xl rounded-2xl p-5 border border-gray-100 flex flex-col gap-3 pointer-events-auto`}
        >
          <div>
            <h4 className="font-bold text-gray-900 text-sm">Confirmar remoção</h4>
            <p className="text-xs text-gray-500 mt-1">
              Deseja realmente remover o insumo{" "}
              <span className="font-semibold text-gray-800">"{insumo.nome}"</span>?
            </p>
          </div>
          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                await executarRemocao(insumo.id);
              }}
              className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-bold text-white transition-colors shadow-sm"
            >
              Remover
            </button>
          </div>
        </div>
      ),
      { id: "confirmar-remocao", duration: 8000 }
    );
  };

  const executarRemocao = async (id: string) => {
    if (!account?.address) return;
    try {
      const res = await fetch(
        `http://localhost:3001/assets/${id}?fornecedorWallet=${account.address}`,
        {
          method: "DELETE",
        }
      );

      if (res.status === 409) {
        notify.error("Este insumo não pode ser removido porque tem propostas vinculadas.");
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg = errData.message || "Erro ao remover insumo.";
        throw Object.assign(new Error(msg), { userMessage: msg });
      }

      notify.success("Insumo removido.");
      await fetchInsumos();
    } catch (err: any) {
      console.warn("Erro ao remover insumo:", err);
      notify.fromError(err);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 animate-in fade-in duration-700">
      {/* Banner Superior */}
      <div className="bg-[#0A1A14] text-white rounded-3xl p-8 mb-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>

        <div className="relative z-10">
          <h1 className="text-3xl font-serif font-bold mb-2">Meus Ativos & CPRs</h1>
          <p className="text-emerald-100/80 text-sm max-w-md">
            Gerencie seus ativos registrados na plataforma e acompanhe as Cédulas de Produto Rural
            (CPRs) em operações de Barter.
          </p>
        </div>

        <div className="relative z-10 w-full md:w-auto flex flex-col items-end gap-3">
          {account ? (
            <>
              <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider">
                Conta Conectada
              </span>
              <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-3 rounded-2xl">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                <span className="font-mono text-sm text-white tracking-wider">
                  <UsuarioDisplay address={account.address} showIcon={false} />
                </span>
              </div>
            </>
          ) : (
            <div className="inline-flex items-center gap-3 bg-red-900/40 border border-red-500/30 px-5 py-3 rounded-2xl text-red-200 text-sm font-medium">
              Carteira Desconectada
            </div>
          )}
        </div>
      </div>

      {/* Conteúdo Principal */}
      {!account ? (
        <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-12 text-center">
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Autenticação Necessária</h2>
          <p className="text-gray-500 mb-8 max-w-md mx-auto">
            Conecte sua carteira para ver seus ativos registrados.
          </p>
          <a
            href="/cadastro"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-all"
          >
            Ir para o Login Web3
          </a>
        </div>
      ) : carregandoPerfil ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
          <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
          <p className="text-emerald-700 font-medium">Identificando perfil de acesso...</p>
        </div>
      ) : (
        <div className="space-y-12">
          {/* VISÃO DO PRODUTOR: Painel Informativo com Atalhos */}
          {tipoUsuario === "PRODUTOR" && (
            <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-8 md:p-10">
              <div className="max-w-2xl">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center text-2xl mb-4">
                  🌾
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Sua produção garante as CPRs de troca por insumos
                </h2>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  Como produtor rural, você emite Cédulas de Produto Rural (CPRs) garantidas por sua
                  safra de café para obter insumos agrícolas de fornecedores parceiros sem desembolso
                  imediato de caixa.
                </p>
                <div className="flex flex-wrap items-center gap-4">
                  <Link
                    href="/hub/vitrine"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-2xl transition-all shadow-md shadow-emerald-600/20 text-sm"
                  >
                    Explorar a Vitrine →
                  </Link>
                  <Link
                    href="/hub/propostas"
                    className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-800 font-bold py-3 px-6 rounded-2xl border border-gray-200 transition-all text-sm"
                  >
                    Propostas e contratos →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* VISÃO DO FORNECEDOR: Seção "Meus insumos" */}
          {tipoUsuario === "FORNECEDOR" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">
                    📦
                  </span>
                  Meus insumos
                </h2>
                <Link
                  href="/hub/novo-ativo"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  + Novo insumo
                </Link>
              </div>

              {carregandoInsumos ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
                  <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-emerald-700 font-medium">Buscando seus insumos...</p>
                </div>
              ) : erroInsumos ? (
                <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl text-center">
                  <p>{erroInsumos}</p>
                </div>
              ) : insumos.length === 0 ? (
                <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-16 text-center">
                  <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl">
                    🌱
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Nenhum insumo cadastrado
                  </h3>
                  <p className="text-gray-500 text-sm max-w-sm mx-auto mb-6">
                    Cadastre os insumos e defensivos agrícolas que você deseja disponibilizar para
                    troca na Vitrine.
                  </p>
                  <Link
                    href="/hub/novo-ativo"
                    className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-emerald-600/20"
                  >
                    Cadastrar Primeiro Insumo
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {insumos.map((insumo) => (
                    <div
                      key={insumo.id}
                      className="bg-white rounded-3xl shadow-sm border border-emerald-100 overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                    >
                      <div className="p-6 border-b border-gray-50">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <h3
                            className="text-xl font-bold text-gray-900 line-clamp-1"
                            title={insumo.nome}
                          >
                            {insumo.nome}
                          </h3>
                          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg shrink-0">
                            {insumo.unidade_medida}
                          </span>
                        </div>
                        <p
                          className="text-sm text-gray-600 line-clamp-2"
                          title={insumo.descricao}
                        >
                          {insumo.descricao}
                        </p>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div className="space-y-3 mb-6">
                          <div className="bg-gray-50 p-4 rounded-2xl">
                            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">
                              Preço unitário
                            </p>
                            <p className="font-bold text-gray-900 text-lg">
                              {Number(insumo.preco_sacas).toLocaleString("pt-BR")} sacas por{" "}
                              {insumo.unidade_medida}
                            </p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-2xl flex items-center justify-between">
                            <span className="text-xs text-gray-500 font-semibold uppercase">
                              Cadastro
                            </span>
                            <span className="font-bold text-gray-900 text-sm">
                              {new Date(insumo.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => abrirEdicao(insumo)}
                            className="px-4 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-bold rounded-xl transition-colors border border-gray-200"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => confirmarRemocao(insumo)}
                            className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl transition-colors border border-red-200"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <hr className="border-gray-200" />

          {/* SEÇÃO ON-CHAIN: Minhas CPRs (Produtor e Fornecedor) */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">
                📜
              </span>
              Minhas CPRs
            </h2>

            {carregandoCprs ? (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                <p className="text-emerald-700 font-medium">Lendo contratos na blockchain...</p>
              </div>
            ) : erroCprs ? (
              <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl text-center">
                <p>{erroCprs}</p>
              </div>
            ) : cprs.length === 0 ? (
              <div className="bg-white/50 border border-dashed border-gray-300 rounded-3xl p-8 text-center text-gray-500">
                Você não possui nenhuma CPR ativa associada à sua carteira no momento.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {cprs.map((cpr) => {
                  const souProdutor =
                    cpr.produtor.toLowerCase() === account.address.toLowerCase();
                  const souFornecedor =
                    cpr.fornecedor.toLowerCase() === account.address.toLowerCase();
                  const souDonoDoToken =
                    cpr.donoAtual?.toLowerCase() === account.address.toLowerCase();

                  return (
                    <div
                      key={cpr.tokenId.toString()}
                      className="bg-white rounded-3xl shadow-sm border border-emerald-500 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden"
                    >
                      <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>

                      <div className="flex-1 w-full pl-4">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span
                            className={`text-xs font-bold uppercase px-3 py-1 rounded-full ${
                              cpr.liquidada
                                ? "bg-gray-100 text-gray-600"
                                : cpr.entregue
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {cpr.liquidada
                              ? "Liquidada"
                              : cpr.entregue
                              ? "Entregue"
                              : "Aguardando entrega"}
                          </span>
                          <span className="text-gray-400 text-sm font-medium">
                            Token #{cpr.tokenId.toString()}
                          </span>
                        </div>

                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{cpr.insumo}</h3>
                        <p className="text-emerald-700 font-bold text-lg mb-2">
                          {cpr.sacas.toString()} Sacas Garantidas
                        </p>

                        <div className="text-xs text-gray-600 mb-4 space-y-1">
                          <p>
                            <span className="font-semibold text-gray-700">Volume acordado:</span>{" "}
                            {cpr.quantidadeInsumo}
                          </p>
                          <p>
                            <span className="font-semibold text-gray-700">Detalhes do café:</span>{" "}
                            Safra {cpr.safra} • {cpr.tipoCafe}
                          </p>
                        </div>

                        <div className="flex flex-wrap gap-3 mb-6">
                          <div className="bg-gray-50 rounded-xl p-3 inline-flex items-center gap-2 border border-gray-100">
                            <span className="text-xs text-gray-500 font-bold uppercase">
                              Produtor:
                            </span>
                            <span className="font-mono text-sm text-gray-700">
                              <UsuarioDisplay address={cpr.produtor} showIcon={false} />
                            </span>
                          </div>
                          <div className="bg-gray-50 rounded-xl p-3 inline-flex items-center gap-2 border border-gray-100">
                            <span className="text-xs text-gray-500 font-bold uppercase">
                              Fornecedor:
                            </span>
                            <span className="font-mono text-sm text-gray-700">
                              <UsuarioDisplay address={cpr.fornecedor} showIcon={false} />
                            </span>
                          </div>
                        </div>

                        {/* Gráfico de Mercado para CPR não liquidada */}
                        {!cpr.liquidada && (
                          <div className="w-full bg-gray-50 rounded-2xl p-5 border border-gray-100 mt-2">
                            <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-2">
                              <h4 className="text-sm font-bold text-gray-700 uppercase">
                                Cotação do Café (KC=F)
                              </h4>
                              {marketData && (
                                <span className="text-emerald-800 font-bold bg-emerald-100/80 border border-emerald-200 px-3 py-1 rounded-lg text-sm text-center">
                                  Valor de liquidação estimado hoje: US${" "}
                                  {(
                                    marketData.precoAtualUsdSaca * Number(cpr.sacas)
                                  ).toLocaleString("en-US", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </span>
                              )}
                            </div>

                            {marketError ? (
                              <div className="h-32 flex items-center justify-center text-sm text-gray-400 italic bg-gray-100/50 rounded-xl border border-dashed border-gray-300">
                                Cotação indisponível no momento
                              </div>
                            ) : !marketData ? (
                              <div className="h-32 flex items-center justify-center bg-gray-100/50 rounded-xl">
                                <div className="w-6 h-6 border-2 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                              </div>
                            ) : (
                              <div className="h-32 w-full bg-white rounded-xl border border-gray-100 pt-2 shadow-sm">
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart data={marketData.historico}>
                                    <XAxis dataKey="data" hide />
                                    <YAxis domain={["auto", "auto"]} hide />
                                    <Tooltip
                                      formatter={(value: any) => [
                                        `US$ ${Number(value).toFixed(2)}`,
                                        "Preço/Saca",
                                      ]}
                                      labelFormatter={(label) => `Data: ${label}`}
                                      contentStyle={{
                                        borderRadius: "12px",
                                        border: "none",
                                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                      }}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="precoUsdSaca"
                                      stroke="#10b981"
                                      strokeWidth={3}
                                      dot={false}
                                      activeDot={{ r: 6 }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Ações da CPR */}
                      <div className="w-full md:w-auto flex flex-col items-end justify-center mt-4 md:mt-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 shrink-0">
                        {souFornecedor && souDonoDoToken && cpr.entregue && !cpr.liquidada && (
                          <BotaoLiquidarCPR
                            contract={myContract}
                            tokenId={cpr.tokenId}
                            onSuccess={fetchCprs}
                          />
                        )}

                        {souProdutor && cpr.aguardandoEntrega && !cpr.liquidada && (
                          <Link
                            href="/hub/propostas"
                            className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700 hover:text-emerald-800 underline"
                          >
                            Confirmar entrega em Propostas →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Edição de Insumo */}
      {montado &&
        insumoEditando &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                fecharEdicao();
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-editar-insumo-titulo"
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-6">
                <h2
                  id="modal-editar-insumo-titulo"
                  className="text-2xl font-bold text-emerald-950 font-serif"
                >
                  Editar Insumo
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  Atualize as informações do produto ofertado.
                </p>
              </div>

              <form onSubmit={salvarEdicao} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Nome do Insumo
                  </label>
                  <input
                    type="text"
                    required
                    value={formEdit.nome}
                    onChange={(e) => setFormEdit({ ...formEdit, nome: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Descrição
                  </label>
                  <input
                    type="text"
                    required
                    value={formEdit.descricao}
                    onChange={(e) => setFormEdit({ ...formEdit, descricao: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Preço em Sacas por Unidade
                  </label>
                  <input
                    type="number"
                    min="0.0001"
                    step="any"
                    required
                    value={formEdit.precoSacas}
                    onChange={(e) => setFormEdit({ ...formEdit, precoSacas: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Unidade de Venda
                  </label>
                  <input
                    type="text"
                    maxLength={40}
                    required
                    value={formEdit.unidadeMedida}
                    onChange={(e) => setFormEdit({ ...formEdit, unidadeMedida: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium"
                  />
                </div>

                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-xs text-emerald-900">
                  Alterar o preço não muda propostas já enviadas: o preço fica registrado na
                  proposta.
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={fecharEdicao}
                    disabled={salvandoInsumo}
                    className="px-6 py-4 rounded-2xl border border-gray-200 bg-white font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={salvandoInsumo}
                    className="flex-1 px-8 py-4 bg-emerald-600 hover:bg-emerald-700 font-bold text-white rounded-2xl shadow-xl shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {salvandoInsumo ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      "Salvar Alterações"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
