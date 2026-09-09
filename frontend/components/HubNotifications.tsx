"use client";

import { useState, useRef, useEffect } from "react";
import { useActiveAccount } from "thirdweb/react";
import Link from "next/link";
import { useNotificacoesCPR } from "@/hooks/useNotificacoesCPR";

export default function HubNotifications() {
  const account = useActiveAccount();
  const { total, detalhes, loading, marcarTodasComoLidas } = useNotificacoesCPR(account?.address);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!account) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botão do Sino */}
      <button 
        onClick={() => {
          if (!isOpen) {
            marcarTodasComoLidas();
          }
          setIsOpen(!isOpen);
        }}
        className="relative p-2 rounded-full hover:bg-emerald-900/50 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <svg className="w-6 h-6 text-emerald-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        
        {total > 0 && (
          <span className="absolute top-0 right-0 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white bg-red-500 border-2 border-[#0A1A14] rounded-full animate-bounce">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100 flex justify-between items-center">
            <h3 className="font-bold text-emerald-900">Notificações</h3>
            {total > 0 && (
              <span className="bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {total} novas
              </span>
            )}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto">
            {loading && detalhes.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500 flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                Atualizando...
              </div>
            ) : detalhes.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-xl">📭</span>
                </div>
                <p className="text-sm text-gray-500 font-medium">Tudo limpo por aqui!</p>
                <p className="text-xs text-gray-400 mt-1">Você não possui pendências.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {detalhes.map((pendencia) => (
                  <li key={pendencia.id} className="relative">
                    <Link 
                      href={pendencia.link}
                      onClick={() => setIsOpen(false)}
                      className={`block p-4 transition-colors ${pendencia.isLida ? 'hover:bg-gray-50 opacity-75' : 'bg-emerald-50/30 hover:bg-emerald-50/70'}`}
                    >
                      <div className="flex gap-3 pr-4">
                        <div className={`flex-shrink-0 mt-1 ${pendencia.isLida ? 'grayscale' : ''}`}>
                          {pendencia.tipo === "proposta_pendente_aceite" && <span>📥</span>}
                          {pendencia.tipo === "aguardando_insumo" && <span>⏳</span>}
                          {pendencia.tipo === "cpr_pronta_liquidar" && <span>💰</span>}
                        </div>
                        <div>
                          <p className={`text-sm leading-snug ${pendencia.isLida ? 'text-gray-600 font-normal' : 'text-gray-800 font-medium'}`}>
                            {pendencia.mensagem}
                          </p>
                          <p className="text-xs text-emerald-600 font-semibold mt-1">
                            Acessar Painel →
                          </p>
                        </div>
                      </div>
                      
                      {!pendencia.isLida && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.6)]"></div>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
