"use client";

import { useState, useEffect } from "react";
import { useActiveAccount, useReadContract } from "thirdweb/react";
import { getContract, prepareContractCall, sendTransaction, prepareEvent, getContractEvents, readContract, parseEventLogs } from "thirdweb";
import { smartBarterLocalChain } from "@/lib/smartBarterChain";
import { createThirdwebClient } from "thirdweb";
import Link from "next/link";
import BotaoConfirmarInsumo from "@/components/BotaoConfirmarInsumo";

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

function BotaoAceitar({ propostaId, onSuccess }: { propostaId: bigint; onSuccess: () => void }) {
  const account = useActiveAccount();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState("");

  const handleAceitar = async () => {
    if (!account) {
      setError("Carteira não conectada.");
      return;
    }

    try {
      setIsPending(true);
      setError("");

      const transaction = prepareContractCall({
        contract: myContract,
        method: "function aceitarProposta(uint256 _propostaId)",
        params: [propostaId],
      });

      await sendTransaction({ transaction, account });
      
      setIsPending(false);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      setIsPending(false);
      setError("Erro ao aceitar proposta. Tente novamente.");
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleAceitar}
        disabled={isPending}
        className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
      >
        {isPending ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            Processando...
          </>
        ) : (
          "Aceitar Proposta"
        )}
      </button>
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
    </div>
  );
}

export default function PropostasPage() {
  const account = useActiveAccount();
  const [refreshCounter, setRefreshCounter] = useState(0);

  // --- PRODUTOR STATE ---
  const [propostasProdutor, setPropostasProdutor] = useState<any[]>([]);
  const [isPendingProdutor, setIsPendingProdutor] = useState(false);

  const addressToSearch = account?.address || "0x0000000000000000000000000000000000000000";

  // --- LEITURA FORNECEDOR (MANTIDA) ---
  const { data, isPending, refetch } = useReadContract({
    contract: myContract,
    method: "function getPropostasPendentesPorFornecedor(address _fornecedor) external view returns (uint256[] ids, (address produtor, address fornecedor, uint256 sacas, string insumo, bool ativa, bool pendente, bool insumoConfirmado)[] pendentes)",
    params: [addressToSearch]
  });

  // --- LEITURA PRODUTOR ---
  useEffect(() => {
    async function fetchPropostasProdutor() {
      if (!account?.address) return;
      setIsPendingProdutor(true);

      try {
        const event = prepareEvent({
          signature: "event PropostaCriada(uint256 indexed propostaId, address indexed produtor, address indexed fornecedor, uint256 sacas, string insumo)",
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

        // 2. Filtrar os eventos onde o produtor e a conta atual
        const meusEventos = events.filter(
          (e: any) => e.args.produtor?.toLowerCase() === account.address.toLowerCase()
        );

        // 3. Ler o status atual de cada proposta encontrada
        const propostasAtivas: any[] = [];
        for (const e of meusEventos) {
          const pId = e.args.propostaId;
          if (pId !== undefined) {
            const p = await readContract({
              contract: myContract,
              method: "function propostas(uint256) view returns (address produtor, address fornecedor, uint256 sacas, string insumo, bool ativa, bool pendente, bool insumoConfirmado)",
              params: [pId],
            });

            // Queremos apenas as ATIVAS (aceitas pelo fornecedor) e NÃO CONFIRMADAS ainda
            const condition = p[4] === true && p[6] === false;

            if (condition) {
              propostasAtivas.push({
                id: pId,
                produtor: p[0],
                fornecedor: p[1],
                sacas: p[2],
                insumo: p[3]
              });
            }
          }
        }

        setPropostasProdutor(propostasAtivas);
      } catch (err) {
        console.error("Erro ao buscar propostas do produtor:", err);
      } finally {
        setIsPendingProdutor(false);
      }
    }

    fetchPropostasProdutor();
  }, [account?.address, refreshCounter]);

  const handleSuccess = () => {
    setRefreshCounter(c => c + 1);
    refetch(); // Força o hook do thirdweb a atualizar
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
              <Link href="/hub/meus-ativos" className="text-white hover:text-emerald-300 transition-colors pb-1">Meus Ativos</Link>
              <Link href="/hub/novo-ativo" className="text-white hover:text-emerald-300 transition-colors pb-1">Novo Ativo</Link>
              <Link href="/hub/propostas" className="text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1">Propostas CPR</Link>
            </div>
            <h1 className="text-3xl font-serif font-bold mb-2">Painel de Propostas</h1>
            <p className="text-emerald-100/80 text-sm max-w-md">
              Visualize suas propostas pendentes e confirme o recebimento de insumos para emitir a CPR.
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
            <p className="text-gray-500 mb-8 max-w-md mx-auto">Conecte sua carteira para ver propostas.</p>
            <Link href="/cadastro" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-all">
              Ir para o Login Web3
            </Link>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* SEÇÃO DO PRODUTOR */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm">👨‍🌾</span>
                Aguardando Recebimento de Insumos (Minhas Propostas)
              </h2>
              {isPendingProdutor ? (
                <div className="flex flex-col items-center justify-center py-10 bg-white rounded-3xl border border-gray-100">
                  <div className="w-8 h-8 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-indigo-700 font-medium">Buscando na blockchain...</p>
                </div>
              ) : propostasProdutor.length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {propostasProdutor.map((proposta) => (
                    <div key={proposta.id.toString()} className="bg-white rounded-3xl shadow-sm border border-indigo-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:shadow-md hover:border-indigo-300">
                      <div className="flex-1 w-full">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="bg-indigo-100 text-indigo-800 text-xs font-bold uppercase px-3 py-1 rounded-full">Proposta Aceita</span>
                          <span className="text-gray-400 text-sm font-medium">ID #{proposta.id.toString()}</span>
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{proposta.insumo}</h3>
                        <p className="text-indigo-700 font-semibold mb-4">{proposta.sacas.toString()} Sacas</p>
                        
                        <div className="bg-gray-50 rounded-xl p-3 inline-flex items-center gap-2 border border-gray-100">
                          <span className="text-xs text-gray-500 font-bold uppercase">Fornecedor:</span>
                          <span className="font-mono text-sm text-gray-700">{proposta.fornecedor}</span>
                        </div>
                      </div>
                      
                      <div className="w-full md:w-auto flex justify-end">
                        <BotaoConfirmarInsumo contract={myContract} propostaId={proposta.id} onSuccess={handleSuccess} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white/50 border border-dashed border-gray-300 rounded-3xl p-8 text-center text-gray-500">
                  Nenhuma proposta sua está aguardando confirmação de insumos no momento.
                </div>
              )}
            </div>

            <hr className="border-gray-200" />

            {/* SEÇÃO DO FORNECEDOR */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">🏭</span>
                Propostas Pendentes de Aceite (Para Mim)
              </h2>
              {isPending ? (
                <div className="flex flex-col items-center justify-center py-10 bg-white rounded-3xl border border-gray-100">
                  <div className="w-8 h-8 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-emerald-700 font-medium">Consultando a blockchain...</p>
                </div>
              ) : data && data[0].length > 0 ? (
                <div className="grid grid-cols-1 gap-6">
                  {data[0].map((id: any, index: number) => {
                    const proposta = data[1][index];
                    return (
                      <div key={id.toString()} className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-6 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:shadow-md hover:border-emerald-300">
                        <div className="flex-1 w-full">
                          <div className="flex items-center gap-3 mb-2">
                            <span className="bg-amber-100 text-amber-800 text-xs font-bold uppercase px-3 py-1 rounded-full">Proposta Pendente</span>
                            <span className="text-gray-400 text-sm font-medium">ID #{id.toString()}</span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-1">{proposta.insumo}</h3>
                          <p className="text-emerald-700 font-semibold mb-4">{proposta.sacas.toString()} Sacas</p>
                          
                          <div className="bg-gray-50 rounded-xl p-3 inline-flex items-center gap-2 border border-gray-100">
                            <span className="text-xs text-gray-500 font-bold uppercase">Produtor:</span>
                            <span className="font-mono text-sm text-gray-700">{proposta.produtor}</span>
                          </div>
                        </div>
                        
                        <div className="w-full md:w-auto flex justify-end">
                          <BotaoAceitar propostaId={id} onSuccess={handleSuccess} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-white/50 border border-dashed border-gray-300 rounded-3xl p-8 text-center text-gray-500">
                  Não há propostas de produtores aguardando o seu aceite.
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
