"use client";

import { useState, useEffect } from "react";
import { ThirdwebProvider, ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { createAuth, signLoginPayload } from "thirdweb/auth";
import { useRouter } from "next/navigation";

// Configuração do Cliente Thirdweb v5
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "d3690d56bdafa6a3cd84d948259dbbe0",
});

const auth = createAuth({
  domain: process.env.NEXT_PUBLIC_DOMAIN || "localhost:3000",
  client,
});

function CadastroFlow() {
  const router = useRouter();
  const account = useActiveAccount();
  
  // Controle da Máquina de Estados Visual
  const [checkingWallet, setCheckingWallet] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    nomeCompleto: "",
    documento: "",
    tipoUsuario: "PRODUTOR",
    nomePropriedadeOuEmpresa: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // EFEITO: Escuta a conexão da carteira e verifica no Back-end
  useEffect(() => {
    async function verifyAccount() {
      if (!account?.address) {
        setUserExists(false);
        setSuccess(false);
        return;
      }
      
      setCheckingWallet(true);
      setError("");

      try {
        const res = await fetch(`http://localhost:3001/users/wallet/${account.address}`);
        if (res.ok) {
          const data = await res.json();
          if (data.exists) {
            setUserExists(true);
            setTimeout(() => {
              router.push('/hub/novo-ativo');
            }, 1500);
          } else {
            setUserExists(false);
          }
        } else {
           console.error("Erro na resposta da API:", res.status);
        }
      } catch (err) {
        console.error("Erro de conexão com a API NestJS:", err);
        setError("Erro ao verificar carteira no servidor.");
      } finally {
        setTimeout(() => setCheckingWallet(false), 800);
      }
    }

    verifyAccount();
  }, [account?.address, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    
    setLoadingSubmit(true);
    setError("");
    
    try {
      // 1. Gera Payload e Solicita Assinatura (SIWE) do Usuário
      const payload = await auth.generatePayload({ address: account.address });
      const signature = await signLoginPayload({ account, payload });

      // 2. Envia para a API NestJS
      const response = await fetch("http://localhost:3001/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          carteiraDigital: account.address,
          payload,
          signature
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao registrar usuário.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/hub/novo-ativo');
      }, 1500);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingSubmit(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-10 flex flex-col items-center">
      
      {/* Botão sempre montado para evitar quebra de estado do Modal da Thirdweb */}
      <div className={`w-full max-w-2xl flex ${account ? 'justify-end mb-4' : 'justify-center scale-110 mt-10'}`}>
        <ConnectButton 
          client={client} 
          connectButton={{ label: "Ativar Identidade Digital" }}
        />
      </div>

      {/* ESTADO 0: Desconectado */}
      {!account && (
        <div className="text-center max-w-lg mt-8 animate-in fade-in zoom-in-95 duration-700">
          <h4 className="text-emerald-500 font-bold tracking-widest text-sm mb-3 uppercase">Login Web3</h4>
          <h1 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6 leading-tight">
            Toda troca começa com uma carteira conectada.
          </h1>
          <p className="text-emerald-100/70 text-lg">
            Sua MetaMask acabou de aparecer no topo? Conecte-a para vincular seu endereço on-chain ao Smart Barter.
          </p>
        </div>
      )}

      {/* RENDERIZAÇÃO PÓS-CONEXÃO */}
      {account && (
        <div className="w-full animate-in fade-in duration-500">
          
          {/* Card da Carteira */}
          <div className="bg-[#0f241a] border border-emerald-800/50 p-6 rounded-3xl shadow-2xl w-full max-w-2xl mx-auto mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
              <svg className="w-40 h-40" fill="currentColor" viewBox="0 0 24 24"><path d="M21 18v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v1h1v12h-1zM5 5v14h14V5H5zm11 9a2 2 0 1 1 0-4 2 2 0 0 1 0 4z"/></svg>
            </div>
            <div className="flex justify-between items-start relative z-10">
              <div>
                <p className="text-emerald-500 text-xs font-bold tracking-widest uppercase mb-1">Conta de Transação</p>
                <h3 className="text-2xl font-serif font-bold text-white">Carteira Vinculada</h3>
              </div>
              <div className="w-12 h-12 rounded-full border border-emerald-700 bg-emerald-900/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-emerald-800/50">
              <p className="text-emerald-500/70 text-xs font-bold uppercase mb-1">Endereço Público</p>
              <p className="font-mono text-emerald-100 text-sm">{account.address}</p>
            </div>

            <div className="mt-6">
              {checkingWallet && (
                <div className="flex items-center gap-3 text-emerald-400 animate-pulse">
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Verificando identidade segura no sistema...</span>
                </div>
              )}

              {!checkingWallet && userExists && (
                <div className="flex items-center gap-3 text-emerald-400 animate-in fade-in slide-in-from-bottom-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  <span className="text-sm font-medium">Bem-vindo de volta! Redirecionando para o seu HUB...</span>
                </div>
              )}

              {!checkingWallet && !userExists && !success && (
                <div className="flex items-center gap-3 text-amber-400 animate-in fade-in slide-in-from-bottom-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  <span className="text-sm font-medium">Conta nova detectada. Por favor, conclua seu cadastro abaixo.</span>
                </div>
              )}

              {success && (
                <div className="flex items-center gap-3 text-emerald-400 animate-in fade-in slide-in-from-bottom-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <span className="text-sm font-medium">Cadastro Finalizado! Preparando o ambiente...</span>
                </div>
              )}
            </div>
          </div>

          {/* ESTADO 2: Usuário Novo (Formulário) */}
          {!checkingWallet && !userExists && !success && (
            <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto bg-white rounded-3xl p-8 sm:p-10 shadow-2xl animate-in slide-in-from-top-8 fade-in duration-700">
              
              <h2 className="text-2xl font-bold text-emerald-950 mb-2">Completar Perfil</h2>
              <p className="text-gray-500 text-sm mb-8">Precisamos de alguns dados físicos para lastrear seus ativos.</p>

              {error && (
                <div className="bg-red-50 text-red-800 p-4 rounded-xl mb-6 text-sm font-medium border border-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Qual é o seu Perfil?</label>
                  <select name="tipoUsuario" value={formData.tipoUsuario} onChange={handleChange} className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-gray-900 font-medium">
                    <option value="PRODUTOR">Produtor Rural</option>
                    <option value="FORNECEDOR">Fornecedor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nome Completo</label>
                  <input type="text" name="nomeCompleto" required value={formData.nomeCompleto} onChange={handleChange} placeholder="Seu nome oficial" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-gray-900" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">CPF ou CNPJ</label>
                    <input type="text" name="documento" required value={formData.documento} onChange={handleChange} placeholder="Apenas números" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-gray-900" />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      {formData.tipoUsuario === 'PRODUTOR' ? 'Nome da Fazenda' : 'Nome da Empresa'}
                    </label>
                    <input type="text" name="nomePropriedadeOuEmpresa" required value={formData.nomePropriedadeOuEmpresa} onChange={handleChange} placeholder="Ex: Fazenda Bela Vista" className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none text-gray-900" />
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-8 border-t border-gray-100 flex justify-end">
                <button type="submit" disabled={loadingSubmit} className="w-full md:w-auto px-10 py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/20 transition-all disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-3">
                  {loadingSubmit ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Salvando...
                    </>
                  ) : "FINALIZAR CADASTRO"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-[#0A1A14] font-sans selection:bg-emerald-500/30 selection:text-emerald-100 flex flex-col justify-center">
      <div className="fixed inset-0 z-0 flex items-center justify-center opacity-30 pointer-events-none">
        <div className="w-[800px] h-[800px] bg-emerald-900/40 rounded-full blur-[120px]"></div>
      </div>
      
      <div className="relative z-10 w-full px-4 py-8">
        <CadastroFlow />
      </div>
    </div>
  );
}
