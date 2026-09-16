"use client";

import { useState, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { createAuth, signLoginPayload } from "thirdweb/auth";
import { toast, Toaster } from "react-hot-toast";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "d3690d56bdafa6a3cd84d948259dbbe0",
});

const auth = createAuth({
  domain: process.env.NEXT_PUBLIC_DOMAIN || "localhost:3000",
  client,
});

export default function PerfilPage() {
  const account = useActiveAccount();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState<any>(null);
  
  // Formulário editável
  const [username, setUsername] = useState("");
  const [nomePropriedade, setNomePropriedade] = useState("");

  // Estado de validação do username
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");

  // Carregar dados
  useEffect(() => {
    async function loadProfile() {
      if (!account?.address) return;
      try {
        const res = await fetch(`http://localhost:3001/users/wallet/${account.address}`);
        if (res.ok) {
          const data = await res.json();
          if (data.exists && data.user) {
            setUserData(data.user);
            setUsername(data.user.username || "");
            setNomePropriedade(data.user.nome_propriedade_ou_empresa || "");
          }
        }
      } catch (err) {
        console.error("Erro ao carregar perfil:", err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, [account?.address]);

  // Debounce para validar username
  useEffect(() => {
    if (!username || username === userData?.username) {
      setUsernameStatus("idle");
      return;
    }

    const regex = /^[a-z0-9_]{3,20}$/;
    if (!regex.test(username)) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    const timeout = setTimeout(async () => {
      try {
        const res = await fetch(`http://localhost:3001/users/username/${username}/available`);
        if (res.ok) {
          const data = await res.json();
          setUsernameStatus(data.available ? "available" : "taken");
        }
      } catch (err) {
        console.error("Erro ao validar username:", err);
        setUsernameStatus("idle");
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [username, userData?.username]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    if (usernameStatus === "taken" || usernameStatus === "invalid") {
      toast.error("Por favor, escolha um @username válido e disponível.");
      return;
    }

    setSaving(true);
    const toastId = toast.loading("Solicitando assinatura segura na carteira...");

    try {
      // 1. Gera Payload e Solicita Assinatura (SIWE)
      const payload = await auth.generatePayload({ address: account.address });
      const signedResult = await signLoginPayload({ account, payload });
      const signature = typeof signedResult === "string" ? signedResult : (signedResult as any)?.signature ?? String(signedResult);

      toast.loading("Salvando alterações...", { id: toastId });

      // 2. Atualiza via PATCH
      const res = await fetch(`http://localhost:3001/users/wallet/${account.address}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: username || undefined,
          nomePropriedadeOuEmpresa: nomePropriedade,
          payload,
          signature
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Erro ao salvar perfil");
      }

      toast.success("Perfil atualizado com sucesso!", { id: toastId });
      
      // Atualiza o cache local
      setUserData({
        ...userData,
        username,
        nome_propriedade_ou_empresa: nomePropriedade
      });
      setUsernameStatus("idle");

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Falha ao atualizar perfil", { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="p-8 text-center bg-[#0f241a] rounded-3xl border border-emerald-900/50">
        <p className="text-emerald-100">Usuário não encontrado ou não cadastrado.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-20">
      <Toaster position="top-right" toastOptions={{ style: { background: '#064e3b', color: '#fff' } }} />
      
      {/* Banner */}
      <div className="relative overflow-hidden bg-emerald-950 rounded-3xl p-8 border border-emerald-800/50 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <svg className="w-32 h-32 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        </div>
        
        <div className="relative z-10">
          <h1 className="text-3xl font-serif font-bold text-white mb-2">Identidade Digital</h1>
          <p className="text-emerald-200/80 max-w-xl">
            Configure seu arroba público para ser facilmente reconhecido na plataforma. 
            Todas as alterações requerem assinatura da sua carteira para máxima segurança.
          </p>
        </div>
      </div>

      {/* Formulário Principal */}
      <form onSubmit={handleSave} className="bg-white rounded-3xl p-8 sm:p-10 shadow-xl border border-gray-100">
        <h2 className="text-2xl font-bold text-emerald-950 mb-8 border-b border-gray-100 pb-4">Editar Perfil</h2>

        <div className="space-y-8">
          
          {/* Seção Editável */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-emerald-50/50 p-6 rounded-2xl border border-emerald-100/50">
            <div>
              <label className="block text-sm font-semibold text-emerald-900 mb-2">@username (público)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600/50 font-medium">@</span>
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase())}
                  placeholder="sua_fazenda_123"
                  className={`w-full pl-8 pr-12 py-3 bg-white border ${usernameStatus === 'invalid' || usernameStatus === 'taken' ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : usernameStatus === 'available' ? 'border-emerald-400 focus:border-emerald-500 focus:ring-emerald-500/20' : 'border-gray-200 focus:border-emerald-500 focus:ring-emerald-500/20'} rounded-xl focus:ring-4 outline-none text-gray-900 font-mono transition-all`}
                />
                
                {/* Status Indicator */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center">
                  {usernameStatus === "checking" && (
                    <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  )}
                  {usernameStatus === "available" && (
                    <svg className="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  )}
                  {usernameStatus === "taken" && (
                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  )}
                </div>
              </div>
              
              {/* Mensagens de Feedback */}
              <div className="mt-2 text-xs font-medium h-4">
                {usernameStatus === "taken" && <span className="text-red-500">Este username já está em uso.</span>}
                {usernameStatus === "available" && <span className="text-emerald-600">Username disponível!</span>}
                {usernameStatus === "invalid" && <span className="text-red-500">Apenas letras minúsculas, números e _. (3-20 chars)</span>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-emerald-900 mb-2">
                {userData.tipo_usuario === 'PRODUTOR' ? 'Nome da Fazenda' : 'Nome da Empresa'}
              </label>
              <input 
                type="text" 
                value={nomePropriedade}
                onChange={(e) => setNomePropriedade(e.target.value)}
                className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-gray-900 transition-all"
              />
            </div>
          </div>

          {/* Seção Apenas Leitura */}
          <div className="space-y-6 pt-6">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Informações de Registro (Imutáveis)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Nome Completo</label>
                <div className="px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 font-medium">
                  {userData.nome_completo}
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Tipo de Conta</label>
                <div className="px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-600 font-medium flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${userData.tipo_usuario === 'PRODUTOR' ? 'bg-amber-400' : 'bg-blue-400'}`}></span>
                  {userData.tipo_usuario}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Carteira Vinculada (0x)</label>
                <div className="px-5 py-3 bg-gray-50 border border-gray-100 rounded-xl text-gray-500 font-mono text-sm flex items-center gap-3">
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>
                  {userData.carteira_digital}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Actions */}
        <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end gap-4">
          <button 
            type="button" 
            onClick={() => {
              setUsername(userData?.username || "");
              setNomePropriedade(userData?.nome_propriedade_ou_empresa || "");
            }}
            className="px-6 py-3 text-gray-500 font-medium hover:bg-gray-50 rounded-xl transition-colors"
          >
            Descartar Alterações
          </button>
          
          <button 
            type="submit" 
            disabled={saving || usernameStatus === 'invalid' || usernameStatus === 'taken' || usernameStatus === 'checking'}
            className="px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Assinando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Assinar e Salvar
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
