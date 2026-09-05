"use client";

import { useState } from "react";
import { useActiveAccount, ThirdwebProvider } from "thirdweb/react";
import { useRouter } from "next/navigation";

function NovoAtivoDashboard() {
  const router = useRouter();
  const account = useActiveAccount();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    tipoAtivo: "CAFE",
    descricao: "",
    quantidade: "",
    unidadeMedida: "SACAS",
    valorEstimado: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setError("Conecte sua carteira para cadastrar o ativo.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const response = await fetch("http://localhost:3001/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          quantidade: Number(formData.quantidade),
          valorEstimado: Number(formData.valorEstimado),
          donoWallet: account.address,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || "Erro ao cadastrar o ativo.");
      }

      setSuccess(true);
      
      // Redireciona para a tela de ativos onde o Botão Web3 estará aguardando
      setTimeout(() => {
        router.push('/hub/meus-ativos');
      }, 1500);
      
    } catch (err: any) {
      console.error("Erro no formulário de ativo:", err);
      setError(err.message);
      setLoading(false);
    } 
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-3xl font-serif font-bold text-emerald-900 mb-3">Ativo RWA Criado!</h2>
        <p className="text-gray-500 mb-6">Redirecionando para a sua carteira de contratos...</p>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-8 animate-in fade-in duration-700">
      
      {/* SEÇÃO SUPERIOR: Painel e Dashboard */}
      <div className="mb-10">
        <div className="bg-emerald-900 text-white rounded-3xl p-8 mb-6 shadow-xl relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          </div>
          
          <div className="relative z-10">
            <h1 className="text-3xl font-serif font-bold mb-2">Visão Geral da Propriedade</h1>
            <p className="text-emerald-100/80 text-sm max-w-md">
              Bem-vindo ao seu painel. Acompanhe a saúde da sua safra e cadastre novos ativos físicos para transformá-los em liquidez na blockchain.
            </p>
          </div>

          <div className="relative z-10 w-full md:w-auto flex flex-col items-end gap-3">
            <span className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">Identidade Digital Ativa</span>
            {account ? (
              <div className="inline-flex items-center gap-3 bg-black/30 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                <span className="font-mono text-sm text-white tracking-wider">
                  {account.address.slice(0, 6)}...{account.address.slice(-4)}
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-3 bg-red-900/40 border border-red-500/30 px-5 py-3 rounded-2xl text-red-200 text-sm font-medium">
                Carteira Desconectada
              </div>
            )}
          </div>
        </div>

        {/* Cards Estatísticos Estáticos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-1">Safra Comprometida</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-gray-900">24%</h3>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">-2% vs ano passado</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-emerald-100 shadow-sm flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-500 mb-1">Cotação do Café (Saca)</p>
              <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-bold text-gray-900">R$ 1.150</h3>
                <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+1.5% hoje</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEÇÃO INFERIOR: Formulário de Novo Ativo */}
      <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-8 md:p-10">
        <div className="mb-8 flex items-center gap-4 border-b border-gray-100 pb-6">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-950">Tokenizar Novo Ativo</h2>
            <p className="text-gray-500 text-sm mt-1">Insira os dados físicos reais da produção agrícola para digitalização.</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de Ativo</label>
              <select name="tipoAtivo" value={formData.tipoAtivo} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium">
                <option value="CAFE">Saca de Café</option>
                <option value="INSUMO">Insumos Agrícolas</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Unidade de Medida</label>
              <select name="unidadeMedida" value={formData.unidadeMedida} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium">
                <option value="SACAS">Sacas (60kg)</option>
                <option value="TONELADAS">Toneladas (Ton)</option>
                <option value="LITROS">Litros (L)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição da Safra ou Produto</label>
            <input type="text" name="descricao" required value={formData.descricao} onChange={handleChange} placeholder="Ex: Café Arábica Safra 24/25 - Peneira 16 acima" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Quantidade Total</label>
              <input type="number" name="quantidade" required min="1" step="0.01" value={formData.quantidade} onChange={handleChange} placeholder="1000" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900" />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Valor Estimado Total (R$)</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-5 text-gray-400 font-semibold">R$</span>
                <input type="number" name="valorEstimado" required min="1" step="0.01" value={formData.valorEstimado} onChange={handleChange} placeholder="1150000.00" className="w-full pl-12 pr-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium" />
              </div>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end">
            <button type="submit" disabled={loading || !account} className="w-full md:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-3">
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Salvando Ativo...</span>
                </>
              ) : (
                "CADASTRAR ATIVO PARA TOKENIZAÇÃO"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NovoAtivoPage() {
  return (
    <div className="min-h-screen bg-[#F8FAF9] text-gray-900 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <NovoAtivoDashboard />
    </div>
  );
}
