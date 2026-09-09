"use client";

import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import BotaoAssinarAcordo from "@/components/BotaoAssinarAcordo";
import BotaoLiquidarCPR from "@/components/BotaoLiquidarCPR";
import Link from "next/link";
import { getContract, prepareEvent, readContract, createThirdwebClient, parseEventLogs } from "thirdweb";
import { smartBarterLocalChain } from "@/lib/smartBarterChain";

// Inicializa o cliente Thirdweb
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "d3690d56bdafa6a3cd84d948259dbbe0",
});

const CONTRACT_ADDRESS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"; 

const myContract = getContract({
  client,
  chain: smartBarterLocalChain,
  address: CONTRACT_ADDRESS,
});

interface Ativo {
  id: string;
  tipo_ativo: string;
  descricao: string;
  quantidade: number;
  unidade_medida: string;
  valor_estimado: number;
  created_at: string;
}

export default function MeusAtivosPage() {
  const account = useActiveAccount();
  const [ativos, setAtivos] = useState<Ativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- CPRs ON-CHAIN STATE ---
  const [cprsOnChain, setCprsOnChain] = useState<any[]>([]);
  const [isPendingCprs, setIsPendingCprs] = useState(false);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Busca ativos OFF-CHAIN (NestJS)
  useEffect(() => {
    async function fetchAtivos() {
      if (!account?.address) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`http://localhost:3001/assets/wallet/${account.address}`);
        if (!res.ok) throw new Error("Erro ao buscar seus ativos");
        const data = await res.json();
        setAtivos(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchAtivos();
  }, [account?.address]);

  // Busca CPRs ON-CHAIN (Smart Contract)
  useEffect(() => {
    async function fetchCprs() {
      if (!account?.address) return;
      setIsPendingCprs(true);

      try {
        const event = prepareEvent({
          signature: "event CPREmitida(uint256 indexed tokenId, address indexed fornecedor, uint256 sacas, string insumo)",
        });

        // 1. Buscar todos os eventos de criacao (bypassando thirdweb proxy)
        const rawResponse = await fetch("http://127.0.0.1:8545", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "eth_getLogs",
            params: [{
              address: myContract.address,
              fromBlock: "0x0",
              toBlock: "latest"
            }]
          })
        });
        const rawData = await rawResponse.json();

        const events = parseEventLogs({
          logs: rawData.result || [],
          events: [event],
        });

        const meusEventos = events.filter(
          (e: any) => e.args.fornecedor?.toLowerCase() === account.address.toLowerCase()
        );

        const ativas: any[] = [];
        for (const e of meusEventos) {
          const tId = e.args.tokenId;
          if (tId !== undefined) {
            // Verificar se ainda esta ativa (se foi liquidada, ativa fica false)
            const p = await readContract({
              contract: myContract,
              method: "function propostas(uint256) view returns (address produtor, address fornecedor, uint256 sacas, string insumo, bool ativa, bool pendente, bool insumoConfirmado)",
              params: [tId],
            });

            if (p[4] === true) {
              ativas.push({
                id: tId,
                produtor: p[0],
                fornecedor: p[1],
                sacas: p[2],
                insumo: p[3]
              });
            }
          }
        }

        setCprsOnChain(ativas);
      } catch (err) {
        console.error("Erro ao buscar CPRs on-chain:", err);
      } finally {
        setIsPendingCprs(false);
      }
    }

    fetchCprs();
  }, [account?.address, refreshCounter]);

  const handleSuccess = () => {
    setRefreshCounter(c => c + 1);
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-gray-900 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <div className="max-w-6xl mx-auto py-12 px-6 animate-in fade-in duration-700">
        
        {/* Banner Superior */}
        <div className="bg-[#0A1A14] text-white rounded-3xl p-8 mb-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          
          <div className="relative z-10">
            <div className="flex gap-6 mb-4">
              <Link href="/hub/meus-ativos" className="text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1">Meus Ativos</Link>
              <Link href="/hub/novo-ativo" className="text-white hover:text-emerald-300 transition-colors pb-1">Novo Ativo</Link>
              <Link href="/hub/propostas" className="text-white hover:text-emerald-300 transition-colors pb-1">Propostas CPR</Link>
            </div>
            <h1 className="text-3xl font-serif font-bold mb-2">Meus Ativos (RWA & CPRs)</h1>
            <p className="text-emerald-100/80 text-sm max-w-md">
              Gerencie seus ativos físicos registrados e suas Cédulas (NFTs) emitidas na blockchain.
            </p>
          </div>

          <div className="relative z-10 w-full md:w-auto flex flex-col items-end gap-3">
            {account ? (
              <>
                <span className="text-emerald-500 text-xs font-bold uppercase tracking-wider">Conta Conectada</span>
                <div className="inline-flex items-center gap-3 bg-white/10 backdrop-blur-md border border-white/20 px-5 py-3 rounded-2xl">
                  <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                  <span className="font-mono text-sm text-white tracking-wider">
                    {account.address.slice(0, 6)}...{account.address.slice(-4)}
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

        {/* Conteúdo */}
        {!account ? (
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-12 text-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Autenticação Necessária</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">Para visualizar seus ativos rurais, você precisa estar com a sua carteira conectada.</p>
            <Link href="/cadastro" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-all">
              Ir para o Login Web3
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* SEÇÃO OFF-CHAIN (Produtor) */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">📦</span>
                Meus Ativos Físicos (Off-Chain)
              </h2>
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-blue-700 font-medium">Buscando seus ativos na nuvem...</p>
                </div>
              ) : error ? (
                <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200">
                  {error}
                </div>
              ) : ativos.length === 0 ? (
                <div className="bg-white/50 border border-dashed border-gray-300 rounded-3xl p-8 text-center text-gray-500">
                  Você ainda não registrou nenhum ativo físico (RWA).
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {ativos.map((ativo) => (
                    <div key={ativo.id} className="bg-white rounded-3xl shadow-sm border border-blue-100 overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-blue-200">
                      {/* Header do Card */}
                      <div className="bg-blue-50/50 p-6 border-b border-blue-100 flex justify-between items-start">
                        <div>
                          <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wider rounded-lg mb-3">
                            {ativo.tipo_ativo}
                          </span>
                          <h3 className="text-xl font-bold text-gray-900 line-clamp-1" title={ativo.descricao}>{ativo.descricao}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Valor Estimado</p>
                          <p className="text-blue-700 font-bold text-lg">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(ativo.valor_estimado)}
                          </p>
                        </div>
                      </div>

                      {/* Corpo do Card */}
                      <div className="p-6 flex-1 flex flex-col justify-between">
                        <div className="grid grid-cols-2 gap-4 mb-8">
                          <div className="bg-gray-50 p-4 rounded-2xl">
                            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Volume</p>
                            <p className="font-bold text-gray-900 text-lg">{ativo.quantidade} <span className="text-sm font-medium text-gray-500">{ativo.unidade_medida.toLowerCase()}</span></p>
                          </div>
                          <div className="bg-gray-50 p-4 rounded-2xl">
                            <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Registro</p>
                            <p className="font-bold text-gray-900 text-sm">{new Date(ativo.created_at).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>

                        {/* Integração Web3 */}
                        <div className="pt-6 border-t border-gray-100">
                          <p className="text-xs text-gray-500 font-semibold uppercase mb-4 text-center">Ação na Blockchain</p>
                          <BotaoAssinarAcordo 
                            quantidadeSacasOriginal={BigInt(ativo.quantidade)} 
                            descricaoInsumo={ativo.descricao}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <hr className="border-gray-200" />

            {/* SEÇÃO ON-CHAIN (Fornecedor) */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">📜</span>
                CPRs Adquiridas (On-Chain NFTs)
              </h2>
              {isPendingCprs ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-emerald-700 font-medium">Lendo a blockchain...</p>
                </div>
              ) : cprsOnChain.length === 0 ? (
                <div className="bg-white/50 border border-dashed border-gray-300 rounded-3xl p-8 text-center text-gray-500">
                  Você não possui nenhuma CPR ativa associada à sua carteira no momento.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {cprsOnChain.map((cpr) => (
                    <div key={cpr.id.toString()} className="bg-white rounded-3xl shadow-sm border border-emerald-500 p-6 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
                      {/* Ribbon / Detalhe visual */}
                      <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>

                      <div className="flex-1 w-full pl-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-emerald-100 text-emerald-800 text-xs font-bold uppercase px-3 py-1 rounded-full">NFT Ativo</span>
                          <span className="text-gray-400 text-sm font-medium">Token ID #{cpr.id.toString()}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-1">{cpr.insumo}</h3>
                        <p className="text-emerald-700 font-bold text-lg mb-4">{cpr.sacas.toString()} Sacas Garantidas</p>
                        
                        <div className="bg-gray-50 rounded-xl p-3 inline-flex items-center gap-2 border border-gray-100">
                          <span className="text-xs text-gray-500 font-bold uppercase">Emitente (Produtor):</span>
                          <span className="font-mono text-sm text-gray-700">{cpr.produtor}</span>
                        </div>
                      </div>
                      
                      <div className="w-full md:w-auto flex justify-end">
                        <BotaoLiquidarCPR contract={myContract} tokenId={cpr.id} onSuccess={handleSuccess} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
