"use client";

import { useState } from "react";
import { prepareContractCall, getContract } from "thirdweb";
import { useSendTransaction } from "thirdweb/react";
import { localhost } from "thirdweb/chains";
import { createThirdwebClient } from "thirdweb";

// 1. Inicializa o cliente Thirdweb (Substitua o ClientID em produção)
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "d3690d56bdafa6a3cd84d948259dbbe0",
});

// 2. Aponta para o contrato implantado (Deployed)
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; 

const myContract = getContract({
  client,
  chain: localhost, // Mudamos para localhost para evitar erros de troca de rede (chain switch)
  address: CONTRACT_ADDRESS,
});

interface BotaoAssinarAcordoProps {
  fornecedorAddress: string;
  quantidadeSacas: bigint;
  descricaoInsumo: string;
}

export default function BotaoAssinarAcordo({
  fornecedorAddress,
  quantidadeSacas,
  descricaoInsumo,
}: BotaoAssinarAcordoProps) {
  // Hook do Thirdweb v5 usando mutateAsync para suportar try/catch nativo
  const { mutateAsync: sendTxAsync, isPending, isSuccess, isError, error } = useSendTransaction();
  
  // Estado local para controle silencioso de cancelamento
  const [isCancelled, setIsCancelled] = useState(false);

  const handleAssinar = async () => {
    setIsCancelled(false);

    // 1. Pop-up de Confirmação (UX Graceful)
    const confirmar = window.confirm("Você tem certeza que deseja assinar e emitir esta CPR na blockchain?");
    if (!confirmar) {
      console.warn("Transação abortada pelo usuário no pop-up.");
      setIsCancelled(true);
      return;
    }

    try {
      // 2. Preparação da Chamada
      const transaction = prepareContractCall({
        contract: myContract,
        method: "function emitirCPR(address _fornecedor, uint256 _sacas, string memory _insumo)",
        params: [fornecedorAddress, quantidadeSacas, descricaoInsumo],
      });

      // 3. Execução Envolvida em Try/Catch
      await sendTxAsync(transaction);
      
    } catch (err: any) {
      // 4. Tratamento Silencioso de Erro (Rejeição da MetaMask ou Chain Switch)
      console.warn("Transação cancelada pelo usuário ou falha de rede:", err);
      setIsCancelled(true);
    }
  };

  // --- Renderização Condicional de Status (UI/UX) ---

  if (isSuccess) {
    return (
      <div className="bg-emerald-50 text-emerald-700 px-6 py-4 rounded-xl border border-emerald-200 flex items-center gap-3 font-semibold shadow-sm animate-in zoom-in duration-300">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        Contrato CPR Emitido e Registrado na Blockchain!
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start gap-3">
      <button
        onClick={handleAssinar}
        disabled={isPending || !fornecedorAddress}
        className="relative overflow-hidden group bg-emerald-900 hover:bg-emerald-950 text-white font-bold py-4 px-8 rounded-2xl shadow-lg transition-all disabled:opacity-70 disabled:cursor-wait flex items-center justify-center min-w-[300px]"
      >
        {isPending ? (
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            <span>Aguardando MetaMask...</span>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <span>Emitir CPR (Assinar Contrato)</span>
            <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </div>
        )}
      </button>

      {/* Alerta Amigável de Cancelamento */}
      {isCancelled && !isPending && (
        <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200 text-sm font-medium w-full animate-in slide-in-from-top-2">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Ação cancelada. Nenhum contrato foi emitido.
        </div>
      )}

      {/* Erro crítico não-esperado */}
      {isError && !isCancelled && (
        <p className="text-red-600 text-sm mt-1 font-medium bg-red-50 p-3 rounded-lg border border-red-100 w-full">
          Erro inesperado na blockchain. Tente novamente.
        </p>
      )}
      
      {!isPending && !isError && !isCancelled && (
        <p className="text-gray-400 text-xs px-2">
          Aguardando clique para iniciar assinatura
        </p>
      )}
    </div>
  );
}
