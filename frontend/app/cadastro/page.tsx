"use client";

import { useState } from "react";
import { ThirdwebProvider, ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";

// 1. Configuração do Cliente Thirdweb (Essencial para a v5)
// No cenário de produção, coloque isso no .env.local (NEXT_PUBLIC_THIRDWEB_CLIENT_ID)
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "d3690d56bdafa6a3cd84d948259dbbe0", // Client ID genérico para testes
});

// Componente principal do Formulário
function CadastroForm() {
  // 2. Hook de Leitura: Pega a conta ativa (endereço 0x...) automaticamente após o login
  const account = useActiveAccount();
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    nomeCompleto: "",
    documento: "",
    tipoUsuario: "PRODUTOR",
    nomePropriedadeOuEmpresa: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 3. Lógica de Envio: Unindo a Wallet (Blockchain) com o Banco Tradicional
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account) return;
    
    setLoading(true);
    setError("");
    
    try {
      // POST para a API NestJS que criamos (rodando na porta 3001)
      const response = await fetch("http://localhost:3001/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          carteiraDigital: account.address, // O elo do cadastro híbrido!
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Erro ao cadastrar na base tradicional.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ESTADO 1: Carteira NÃO conectada
  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center space-y-6 py-12">
        <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100 text-center max-w-md shadow-sm">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-6">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="text-2xl font-serif font-semibold text-emerald-950 mb-3">Segurança em Primeiro Lugar</h2>
          <p className="text-emerald-800 mb-8 leading-relaxed">
            Por favor, ative sua <strong className="font-semibold">Identidade Digital</strong> para iniciar o cadastro seguro na plataforma Smart Barter.
          </p>
          
          {/* Web3 Invisível: Botão customizado sem jargões como "Connect Wallet" */}
          <ConnectButton 
            client={client} 
            connectButton={{ label: "Ativar Identidade Digital" }}
          />
        </div>
      </div>
    );
  }

  // ESTADO 2: Cadastro Concluído com Sucesso
  if (success) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 mb-6 shadow-sm">
          <svg className="w-10 h-10 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-3xl font-serif font-bold text-emerald-950 mb-3">Cadastro Finalizado!</h2>
        <p className="text-gray-600 max-w-md mx-auto text-lg">Sua identidade digital foi vinculada com sucesso aos seus dados. Você já pode operar no Smart Barter.</p>
      </div>
    );
  }

  // ESTADO 3: Carteira Conectada -> Mostrar Formulário Tradicional
  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200/60">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">Finalizar Cadastro</h1>
          <p className="text-gray-500 mt-2">Complete seus dados para acessar o Smart Barter.</p>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-1.5">Identidade Ativa</span>
          <span className="bg-emerald-50 text-emerald-700 px-3.5 py-1.5 rounded-full font-mono text-sm border border-emerald-200/60 shadow-sm flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {account.address.slice(0, 6)}...{account.address.slice(-4)}
          </span>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl shadow-sm">
          <p className="text-red-800 text-sm font-medium">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
          
          {/* Seção 1: Seleção de Perfil com Shadcn Style Radio Cards */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-4">Qual é o seu perfil de atuação?</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`cursor-pointer border-2 p-5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${formData.tipoUsuario === 'PRODUTOR' ? 'border-emerald-600 bg-emerald-50/30' : 'border-gray-100 hover:border-emerald-200 bg-gray-50/50'}`}>
                <input type="radio" name="tipoUsuario" value="PRODUTOR" checked={formData.tipoUsuario === 'PRODUTOR'} onChange={handleChange} className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-gray-300" />
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900">Produtor Rural</span>
                  <span className="text-xs text-gray-500 mt-0.5">Comprador de insumos via café</span>
                </div>
              </label>
              
              <label className={`cursor-pointer border-2 p-5 rounded-2xl flex items-center gap-4 transition-all duration-200 ${formData.tipoUsuario === 'FORNECEDOR' ? 'border-emerald-600 bg-emerald-50/30' : 'border-gray-100 hover:border-emerald-200 bg-gray-50/50'}`}>
                <input type="radio" name="tipoUsuario" value="FORNECEDOR" checked={formData.tipoUsuario === 'FORNECEDOR'} onChange={handleChange} className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 border-gray-300" />
                <div className="flex flex-col">
                  <span className="font-semibold text-gray-900">Fornecedor</span>
                  <span className="text-xs text-gray-500 mt-0.5">Vendedor de insumos agrícolas</span>
                </div>
              </label>
            </div>
          </div>

          <div className="w-full h-px bg-gray-100"></div>

          {/* Seção 2: Dados Tradicionais (Off-chain) */}
          <div className="space-y-5">
            <div>
              <label htmlFor="nomeCompleto" className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Completo</label>
              <input type="text" id="nomeCompleto" name="nomeCompleto" required value={formData.nomeCompleto} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900" placeholder="Ex: João da Silva" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label htmlFor="documento" className="block text-sm font-semibold text-gray-700 mb-1.5">CPF ou CNPJ</label>
                <input type="text" id="documento" name="documento" required value={formData.documento} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900" placeholder="000.000.000-00" />
              </div>
              
              <div>
                <label htmlFor="nomePropriedadeOuEmpresa" className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {formData.tipoUsuario === 'PRODUTOR' ? 'Nome da Fazenda' : 'Nome da Empresa'}
                </label>
                <input type="text" id="nomePropriedadeOuEmpresa" name="nomePropriedadeOuEmpresa" required value={formData.nomePropriedadeOuEmpresa} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-gray-900" placeholder={formData.tipoUsuario === 'PRODUTOR' ? 'Fazenda Boa Vista' : 'Agro Insumos S.A.'} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button type="submit" disabled={loading} className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-70 disabled:cursor-wait text-sm tracking-wide">
            {loading ? "Processando..." : "FINALIZAR CADASTRO"}
          </button>
        </div>
      </form>
    </div>
  );
}

// 4. Isolamento do Provider: 
// O ThirdwebProvider DEVE envolver os componentes que usam seus hooks.
export default function CadastroPage() {
  return (
    <div className="min-h-screen bg-[#FBFDFB] text-gray-900 font-sans">
      <ThirdwebProvider>
        <div className="container mx-auto px-4 py-8">
          <CadastroForm />
        </div>
      </ThirdwebProvider>
    </div>
  );
}
