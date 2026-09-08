"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import Link from "next/link";
import BotaoAssinarAcordo from "@/components/BotaoAssinarAcordo";

export default function VitrinePage() {
  const account = useActiveAccount();
  const [insumos, setInsumos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchInsumos() {
      setIsLoading(true);
      try {
        const res = await fetch("http://localhost:3001/assets?tipo_ativo=INSUMO");
        if (!res.ok) {
          throw new Error("Falha ao buscar insumos na vitrine.");
        }
        const data = await res.json();
        setInsumos(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInsumos();
  }, []);

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-gray-900 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <div className="max-w-6xl mx-auto py-12 px-6 animate-in fade-in duration-700">
        
        {/* Banner Superior */}
        <div className="bg-[#0A1A14] text-white rounded-3xl p-8 mb-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          
          <div className="relative z-10">
            <div className="flex flex-wrap gap-6 mb-4">
              <Link href="/hub/meus-ativos" className="text-white hover:text-emerald-300 transition-colors pb-1">Meus Ativos</Link>
              <Link href="/hub/novo-ativo" className="text-white hover:text-emerald-300 transition-colors pb-1">Novo Ativo</Link>
              <Link href="/hub/propostas" className="text-white hover:text-emerald-300 transition-colors pb-1">Propostas CPR</Link>
              <Link href="/hub/vitrine" className="text-emerald-400 font-bold border-b-2 border-emerald-400 pb-1">Vitrine de Insumos</Link>
            </div>
            <h1 className="text-3xl font-serif font-bold mb-2">Vitrine de Insumos</h1>
            <p className="text-emerald-100/80 text-sm max-w-md">
              Navegue pelos produtos cadastrados pelos fornecedores e proponha trocas através da blockchain.
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

        {/* Conteúdo da Vitrine */}
        {!account ? (
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-12 text-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Autenticação Necessária</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">Conecte sua carteira para ver a vitrine de insumos.</p>
            <Link href="/cadastro" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-all">
              Ir para o Login Web3
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-sm">🛒</span>
              Insumos Disponíveis
            </h2>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
                <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
                <p className="text-emerald-700 font-medium">Carregando catálogo de produtos...</p>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-3xl text-center">
                <p>{error}</p>
              </div>
            ) : insumos.length === 0 ? (
              <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-16 text-center">
                <p className="text-gray-500 text-lg">Nenhum insumo disponível no momento.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {insumos.map((insumo) => (
                  <div key={insumo.id} className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-6 flex flex-col justify-between transition-all hover:shadow-md hover:border-emerald-300">
                    
                    <div className="mb-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-800 text-xs font-bold uppercase px-3 py-1 rounded-full">
                          <span>{insumo.dono_tipo_usuario} — {insumo.dono_nome_propriedade_ou_empresa}</span>
                        </div>
                        <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                          {insumo.dono_wallet.slice(0, 6)}...{insumo.dono_wallet.slice(-4)}
                        </span>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mt-3">{insumo.descricao}</h3>
                      <p className="text-emerald-700 font-semibold mt-1">
                        {insumo.quantidade} {insumo.unidade_medida}
                      </p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500 font-medium mb-1">Preço Total Estimado</div>
                        <div className="text-2xl font-black text-gray-900">
                          US$ {Number(insumo.valor_estimado_usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-xs text-gray-400 font-medium mt-1">
                          ≈ R$ {Number(insumo.valor_estimado_brl).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                      </div>
                      
                      {/* Botao de assinar acordo para propor CPR */}
                      <BotaoAssinarAcordo 
                        descricaoInsumo={insumo.descricao} 
                        quantidadeSacasOriginal={BigInt(Math.max(1, Math.floor(insumo.valor_estimado_brl / 1500)))} 
                      />
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
