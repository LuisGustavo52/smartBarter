"use client";

import { useState } from "react";
import { prepareContractCall, getContract, sendTransaction } from "thirdweb";
import { useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { smartBarterLocalChain } from "@/lib/smartBarterChain";
import { createThirdwebClient } from "thirdweb";

// 1. Inicializa o cliente Thirdweb
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "d3690d56bdafa6a3cd84d948259dbbe0",
});

// 2. Aponta para o contrato implantado (Deployed)
const CONTRACT_ADDRESS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853"; 

const myContract = getContract({
  client,
  chain: smartBarterLocalChain, // Usando a chain customizada com Chain ID 31337
  address: CONTRACT_ADDRESS,
});

interface BotaoAssinarAcordoProps {
  descricaoInsumo: string;
  quantidadeSacasOriginal: bigint;
}

export default function BotaoAssinarAcordo({
  descricaoInsumo,
  quantidadeSacasOriginal,
}: BotaoAssinarAcordoProps) {
  const account = useActiveAccount();
  const activeChain = useActiveWalletChain();
  
  // Estado local
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);
  const [fornecedor, setFornecedor] = useState("");
  const [sacas, setSacas] = useState(quantidadeSacasOriginal.toString());

  const handleAssinar = async () => {
    setIsCancelled(false);
    setIsError(false);
    
    if (!account) {
      alert("Conecte sua carteira primeiro.");
      return;
    }

    // Validação básica do endereço
    if (!fornecedor.startsWith("0x") || fornecedor.length !== 42) {
      alert("Por favor, insira um endereço de fornecedor válido (formato 0x...).");
      return;
    }

    const qtdSacas = BigInt(sacas);
    if (qtdSacas <= BigInt(0)) {
      alert("A quantidade de sacas deve ser maior que zero.");
      return;
    }

    // 1. Pop-up de Confirmação (UX Graceful)
    const confirmar = window.confirm("Você tem certeza que deseja propor esta CPR na blockchain?");
    if (!confirmar) {
      console.warn("Transação abortada pelo usuário no pop-up.");
      setIsCancelled(true);
      return;
    }

    try {
      setIsPending(true);
      // 2. Preparação da Chamada - corrigido para proporCPR
      const transaction = prepareContractCall({
        contract: myContract,
        method: "function proporCPR(address _fornecedor, uint256 _sacas, string memory _insumo)",
        params: [fornecedor, qtdSacas, descricaoInsumo],
      });

      // 3. Execução Envolvida em Try/Catch (Bypassando o hook para evitar switchChain)
      await sendTransaction({ transaction, account });
      
      setIsPending(false);
      setIsSuccess(true);
    } catch (err: any) {
      // 4. Tratamento Silencioso de Erro (Rejeição da MetaMask ou Chain Switch)
      console.warn("Transação cancelada pelo usuário ou falha de rede:", err);
      setIsPending(false);
      setIsError(true);
      setIsCancelled(true);
    }
  };

  // --- Renderização Condicional de Status (UI/UX) ---
  if (isSuccess) {
    return (
      <div className="bg-emerald-50 text-emerald-700 px-6 py-4 rounded-xl border border-emerald-200 flex items-center gap-3 font-semibold shadow-sm animate-in zoom-in duration-300">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Proposta de CPR Enviada e Registrada na Blockchain!
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-4 w-full">
      <div className="w-full flex flex-col gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Carteira do Fornecedor</label>
          <input
            type="text"
            placeholder="0x..."
            value={fornecedor}
            onChange={(e) => setFornecedor(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Qtd de Sacas</label>
          <input
            type="number"
            min="1"
            value={sacas}
            onChange={(e) => setSacas(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-4 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      <button
        onClick={handleAssinar}
        disabled={isPending || fornecedor.length !== 42}
        className="relative w-full overflow-hidden group bg-emerald-900 hover:bg-emerald-950 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[300px]"
      >
        {isPending ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Aguardando MetaMask...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span>Propor CPR (Assinar)</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </div>
        )}
      </button>

      {/* Alerta Amigável de Cancelamento */}
      {isCancelled && !isPending && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200 text-sm font-medium w-full animate-in slide-in-from-top-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Ação cancelada.
        </div>
      )}

      {/* Erro crítico não-esperado */}
      {isError && !isCancelled && (
        <p className="text-red-600 text-sm mt-1 font-medium bg-red-50 p-3 rounded-lg border border-red-100 w-full">
          Erro inesperado na blockchain. Tente novamente.
        </p>
      )}
    </div>
  );
}
