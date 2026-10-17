"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import BotaoAssinarAcordo from "@/components/BotaoAssinarAcordo";
import UsuarioDisplay from "@/components/UsuarioDisplay";
import ReputacaoEstrelas from "@/components/ReputacaoEstrelas";
import { notify } from "@/lib/notify";

export default function VitrinePage() {
  const account = useActiveAccount();
  const [insumos, setInsumos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isProdutor, setIsProdutor] = useState(false);
  const [checkingProfile, setCheckingProfile] = useState(true);

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
        console.warn("Erro ao buscar vitrine:", err);
        notify.error("Não foi possível carregar a vitrine. Verifique a conexão.", "vitrine-error");
        setError("Não foi possível carregar os insumos da vitrine.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchInsumos();
  }, []);

  useEffect(() => {
    if (!account?.address) {
      setIsProdutor(false);
      setCheckingProfile(false);
      return;
    }
    setCheckingProfile(true);
    fetch(`http://localhost:3001/users/wallet/${account.address}`)
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível consultar o perfil.");
        return response.json();
      })
      .then((payload) => {
        // A API retorna { exists, user }, não o usuário diretamente.
        const user = payload?.user;
        setIsProdutor(user?.tipo_usuario?.toUpperCase() === "PRODUTOR");
      })
      .catch((profileError) => {
        console.warn("Erro ao consultar perfil da carteira:", profileError);
        setIsProdutor(false);
      })
      .finally(() => setCheckingProfile(false));
  }, [account?.address]);

  return (
    <div className="max-w-6xl mx-auto py-12 px-6 animate-in fade-in duration-700">
      
      {/* Banner Superior */}
      <div className="bg-[#0A1A14] text-white rounded-3xl p-8 mb-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        
        <div className="relative z-10">
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

        {/* Conteúdo da Vitrine */}
        {!account ? (
          <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-12 text-center">
            <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Autenticação Necessária</h2>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">Conecte sua carteira para ver a vitrine de insumos.</p>
            <a href="/cadastro" className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-8 rounded-xl transition-all">
              Ir para o Login Web3
            </a>
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
                          <span>Fornecedor</span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-xs font-mono text-gray-400 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                            <UsuarioDisplay address={insumo.fornecedor_wallet} showIcon={false} />
                          </span>
                          <ReputacaoEstrelas carteira={insumo.fornecedor_wallet} />
                        </div>
                      </div>
                      
                      <h3 className="text-xl font-bold text-gray-900 mt-3">{insumo.nome}</h3>
                      <p className="text-gray-600 mt-1">{insumo.descricao}</p>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-500 font-medium mb-1">Preço em sacas de café</div>
                        <div className="text-2xl font-black text-gray-900">
                          {Number(insumo.preco_sacas).toLocaleString('pt-BR')} sacas por {insumo.unidade_medida ?? "unidade"}
                        </div>
                      </div>
                      
                      {/* Botao de assinar acordo para propor CPR */}
                      {checkingProfile ? (
                        <span className="text-sm font-medium text-gray-500">Verificando perfil...</span>
                      ) : isProdutor ? (
                        <BotaoAssinarAcordo assetId={insumo.id} fornecedorWallet={insumo.fornecedor_wallet} precoSacas={Number(insumo.preco_sacas)} unidadeMedida={insumo.unidade_medida} />
                      ) : (
                        <span className="text-sm font-medium text-gray-500">Apenas produtores podem fazer propostas.</span>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
  );
}
