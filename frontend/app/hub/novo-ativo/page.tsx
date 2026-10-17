"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UsuarioDisplay from "@/components/UsuarioDisplay";
import { notify } from "@/lib/notify";

function NovoAtivoDashboard() {
  const router = useRouter();
  const account = useActiveAccount();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    if (!account?.address) {
      setUserRole(null);
      return;
    }
    fetch(`http://localhost:3001/users/wallet/${account.address}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Não foi possível verificar perfil");
        const data = await res.json();
        setUserRole(data?.user?.tipo_usuario || null);
      })
      .catch((err) => {
        console.warn("Erro ao checar perfil na tela de cadastro de insumo:", err);
        // Não bloquear se a consulta falhar (a API valida de qualquer forma)
        setUserRole(null);
      });
  }, [account?.address]);

  const [formData, setFormData] = useState({
    nome: "",
    descricao: "",
    unidadeMedida: "unidade",
    precoSacas: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) {
      setError("Conecte sua carteira para cadastrar o insumo.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess(false);

    let toastId;
    try {
      toastId = notify.loading("Cadastrando insumo...");
      const response = await fetch("http://localhost:3001/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: formData.nome,
          descricao: formData.descricao,
          precoSacas: Number(formData.precoSacas),
          unidadeMedida: formData.unidadeMedida.trim(),
          fornecedorWallet: account.address,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        const msg = Array.isArray(errData.message) ? errData.message.join(" ") : errData.message || "Erro ao cadastrar o insumo.";
        throw Object.assign(new Error(msg), { userMessage: msg });
      }

      setSuccess(true);
      notify.success("Insumo cadastrado com sucesso!", toastId);

      setTimeout(() => {
        router.push("/hub/vitrine");
      }, 1500);
    } catch (err: any) {
      console.warn("Erro no formulário de insumo:", err);
      notify.fromError(err, toastId);
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>
        <h2 className="text-3xl font-serif font-bold text-emerald-900 mb-3">Insumo cadastrado!</h2>
        <p className="text-gray-500 mb-6">Redirecionando para a Vitrine...</p>
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
              Bem-vindo ao seu painel. Cadastre insumos e produtos para disponibilizá-los aos produtores na Vitrine através de trocas seguras.
            </p>
          </div>

          <div className="relative z-10 w-full md:w-auto flex flex-col items-end gap-3">
            <span className="text-emerald-200 text-xs font-semibold uppercase tracking-wider">Identidade Digital Ativa</span>
            {account ? (
              <div className="inline-flex items-center gap-3 bg-black/30 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl">
                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.8)]"></div>
                <span className="font-mono text-sm text-white tracking-wider">
                  <UsuarioDisplay address={account.address} showIcon={false} />
                </span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-3 bg-red-900/40 border border-red-500/30 px-5 py-3 rounded-2xl text-red-200 text-sm font-medium">
                Carteira Desconectada
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SEÇÃO INFERIOR: Formulário de Insumo */}
      <div className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-8 md:p-10">
        <div className="mb-8 flex items-center gap-4 border-b border-gray-100 pb-6">
          <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-emerald-950">Cadastrar Insumo</h2>
            <p className="text-gray-500 text-sm mt-1">Informe o insumo, a unidade de venda e o preço em sacas de café por unidade.</p>
          </div>
        </div>

        {userRole && userRole !== "FORNECEDOR" && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium text-sm">
              Apenas fornecedores cadastram insumos. Produtores encontram os insumos na{" "}
              <Link href="/hub/vitrine" className="underline font-bold text-amber-900 hover:text-amber-950">
                Vitrine
              </Link>
              .
            </span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6 flex items-center gap-3">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            <span className="font-medium">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nome do Insumo</label>
              <input
                type="text"
                name="nome"
                required
                value={formData.nome}
                onChange={handleChange}
                placeholder="Ex: Fertilizante NPK 20-05-20"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Unidade de Venda</label>
              <input
                type="text"
                name="unidadeMedida"
                required
                maxLength={40}
                list="unidades-sugeridas"
                value={formData.unidadeMedida}
                onChange={handleChange}
                placeholder="Ex: saco 50 kg"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium"
              />
              <datalist id="unidades-sugeridas">
                <option value="unidade" />
                <option value="saco 50 kg" />
                <option value="litro" />
                <option value="tonelada" />
                <option value="galão" />
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Descrição</label>
            <input
              type="text"
              name="descricao"
              required
              value={formData.descricao}
              onChange={handleChange}
              placeholder="Ex: Fertilizante mineral misto de alta solubilidade para lavouras de café."
              className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Preço em Sacas de Café por Unidade</label>
            <div className="relative">
              <input
                type="number"
                name="precoSacas"
                required
                min="0.0001"
                step="any"
                value={formData.precoSacas}
                onChange={handleChange}
                placeholder="Ex: 12.5"
                className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900 font-medium"
              />
              <span className="absolute inset-y-0 right-0 flex items-center pr-5 text-gray-400 font-semibold pointer-events-none">
                sacas
              </span>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={loading || !account || (!!userRole && userRole !== "FORNECEDOR")}
              className="w-full md:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center gap-3"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Salvando Insumo...</span>
                </>
              ) : (
                "CADASTRAR INSUMO"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NovoAtivoPage() {
  return <NovoAtivoDashboard />;
}
