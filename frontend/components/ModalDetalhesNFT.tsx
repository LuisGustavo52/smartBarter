"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import UsuarioDisplay from "@/components/UsuarioDisplay";

export interface DadosNFTModal {
  tokenId: bigint | number | string;
  produtor: string;
  fornecedor: string;
  sacas: bigint | number | string;
  insumo?: string | null;
  quantidadeInsumo?: string | null;
  safra?: string | null;
  tipoCafe?: string | null;
  qualidade?: string | null;
  liquidada: boolean;
}

interface ModalDetalhesNFTProps {
  isOpen: boolean;
  onClose: () => void;
  dados: DadosNFTModal | null;
}

export default function ModalDetalhesNFT({
  isOpen,
  onClose,
  dados,
}: ModalDetalhesNFTProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    closeBtnRef.current?.focus();

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !dados || typeof document === "undefined") return null;

  const isLiquidada = dados.liquidada;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-nft-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className="bg-[#0A1A14] text-white rounded-3xl p-6 md:p-8 border border-emerald-500/30 shadow-2xl max-w-lg w-full relative overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto"
      >
        {/* Detalhe visual de fundo em degradê */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 via-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        {/* Cabeçalho do Modal com Ícone de Café */}
        <div className="flex items-start justify-between gap-4 mb-6 relative z-10 border-b border-emerald-900/60 pb-6">
          <div className="flex items-center gap-4">
            {/* Ícone de Café estilizado em Dourado e Esmeralda */}
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 via-emerald-900/40 to-emerald-950 border border-amber-400/30 flex items-center justify-center shadow-lg shadow-emerald-950/50 shrink-0">
              <svg
                className="w-8 h-8 text-amber-400"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
                <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
                <line x1="6" y1="2" x2="6" y2="4" stroke="#10b981" />
                <line x1="10" y1="2" x2="10" y2="4" stroke="#f59e0b" />
                <line x1="14" y1="2" x2="14" y2="4" stroke="#10b981" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3
                  id="modal-nft-title"
                  className="text-2xl font-serif font-bold text-white tracking-wide"
                >
                  CPR #{dados.tokenId.toString()}
                </h3>
              </div>
              <p className="text-emerald-300/80 text-xs font-mono uppercase tracking-wider mt-0.5">
                NFT ERC-721 • Cédula de Produto Rural
              </p>
            </div>
          </div>

          {/* Badge de Status */}
          <div className="shrink-0">
            {isLiquidada ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                Liquidada
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                Ativa
              </span>
            )}
          </div>
        </div>

        {/* Corpo com Informações do NFT */}
        <div className="space-y-3.5 relative z-10 text-sm">
          {/* Produtor / Emitente */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col gap-1">
            <span className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider">
              Produtor Rural (Emitente da CPR)
            </span>
            <div className="font-mono text-sm text-white pt-0.5">
              <UsuarioDisplay address={dados.produtor} showIcon={false} />
            </div>
          </div>

          {/* Fornecedor / Detentor */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex flex-col gap-1">
            <span className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider">
              Fornecedor de Insumos (Detentor do NFT)
            </span>
            <div className="font-mono text-sm text-white pt-0.5">
              <UsuarioDisplay address={dados.fornecedor} showIcon={false} />
            </div>
          </div>

          {/* Sacas Garantidas */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider">
              Sacas Garantidas
            </span>
            <span className="text-lg font-bold text-amber-400">
              {dados.sacas.toString()} Sacas (60kg)
            </span>
          </div>

          {/* Quantidade do Insumo */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between gap-4">
            <span className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider">
              Quantidade do Insumo
            </span>
            <span className="font-medium text-white text-right break-words">
              {dados.insumo
                ? `${dados.insumo} (${dados.quantidadeInsumo || "Não informado"})`
                : dados.quantidadeInsumo || "Não informado"}
            </span>
          </div>

          {/* Safra */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider">
              Safra
            </span>
            <span className="font-medium text-white">
              {dados.safra?.trim() ? dados.safra : "Não especificado"}
            </span>
          </div>

          {/* Tipo de Café */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider">
              Tipo de Café
            </span>
            <span className="font-medium text-white">
              {dados.tipoCafe?.trim() ? dados.tipoCafe : "Não especificado"}
            </span>
          </div>

          {/* Qualidade (dado off-chain lido da proposta no banco) */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-200/70 uppercase tracking-wider">
              Qualidade
            </span>
            <span className="font-medium text-white">
              {dados.qualidade?.trim() ? dados.qualidade : "Não disponível"}
            </span>
          </div>
        </div>

        {/* Rodapé com Botão Fechar */}
        <div className="mt-8 pt-6 border-t border-emerald-900/60 flex justify-end relative z-10">
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-950/40 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

