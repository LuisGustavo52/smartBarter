"use client";

import { useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import BotaoAssinarAcordo from "@/components/BotaoAssinarAcordo";
import Link from "next/link";

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

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-gray-900 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <div className="max-w-6xl mx-auto py-12 px-6 animate-in fade-in duration-700">
        
        {/* Banner Superior */}
        <div className="bg-[#0A1A14] text-white rounded-3xl p-8 mb-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-serif font-bold mb-2">Meus Ativos (RWA)</h1>
            <p className="text-emerald-100/80 text-sm max-w-md">
              Gerencie seus ativos físicos registrados e assine a emissão de CPR na blockchain.
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
        ) : loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
            <p className="text-emerald-700 font-medium">Buscando seus ativos na nuvem...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200">
            {error}
          </div>
        ) : ativos.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Nenhum Ativo Encontrado</h2>
            <p className="text-gray-500 mb-8">Você ainda não registrou nenhum ativo físico (RWA) para tokenização.</p>
            <Link href="/hub/novo-ativo" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-all">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Cadastrar Novo Ativo
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {ativos.map((ativo) => (
              <div key={ativo.id} className="bg-white rounded-3xl shadow-sm border border-emerald-100 overflow-hidden flex flex-col transition-all hover:shadow-md hover:border-emerald-200">
                {/* Header do Card */}
                <div className="bg-emerald-50/50 p-6 border-b border-emerald-100 flex justify-between items-start">
                  <div>
                    <span className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold uppercase tracking-wider rounded-lg mb-3">
                      {ativo.tipo_ativo}
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-1" title={ativo.descricao}>{ativo.descricao}</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Valor Estimado</p>
                    <p className="text-emerald-700 font-bold text-lg">
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
                      fornecedorAddress={account.address} 
                      quantidadeSacas={BigInt(ativo.quantidade)} 
                      descricaoInsumo={ativo.descricao}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
