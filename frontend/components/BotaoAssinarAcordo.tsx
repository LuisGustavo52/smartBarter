"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useActiveAccount } from "thirdweb/react";
import { notify } from "@/lib/notify";

interface Props {
  assetId: string;
  fornecedorWallet: string;
  precoSacas: number;
  unidadeMedida?: string;
  nomeInsumo?: string;
}

export default function BotaoAssinarAcordo({
  assetId,
  fornecedorWallet,
  precoSacas,
  unidadeMedida = "unidade",
  nomeInsumo,
}: Props) {
  const account = useActiveAccount();
  const [modalAberto, setModalAberto] = useState(false);
  const [montado, setMontado] = useState(false);
  const [quantidade, setQuantidade] = useState("1");
  const [safra, setSafra] = useState("");
  const [tipoCafe, setTipoCafe] = useState("");
  const [pending, setPending] = useState(false);
  const [success, setSuccess] = useState(false);

  // Cotação de café (KC=F)
  const [cotacaoCafe, setCotacaoCafe] = useState<number | null>(null);
  const [carregandoCotacao, setCarregandoCotacao] = useState(false);
  const [erroCotacao, setErroCotacao] = useState(false);

  const quantidadeInputRef = useRef<HTMLInputElement>(null);

  // Guarda "montado" para client component (createPortal)
  useEffect(() => {
    setMontado(true);
  }, []);

  // Foco no primeiro campo ao abrir o modal
  useEffect(() => {
    if (modalAberto) {
      const timer = setTimeout(() => {
        quantidadeInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [modalAberto]);

  // Consulta da cotação do café ao abrir o modal
  useEffect(() => {
    if (!modalAberto) return;
    setCarregandoCotacao(true);
    setErroCotacao(false);
    fetch("http://localhost:3001/market/cafe")
      .then(async (res) => {
        if (!res.ok) throw new Error("Falha ao buscar cotação do café");
        const data = await res.json();
        const preco = Number(data?.precoAtualUsdSaca);
        if (Number.isFinite(preco) && preco > 0) {
          setCotacaoCafe(preco);
        } else {
          throw new Error("Preço retornado inválido");
        }
      })
      .catch((err) => {
        console.warn("Erro ao buscar cotação do café:", err);
        setErroCotacao(true);
        setCotacaoCafe(null);
      })
      .finally(() => {
        setCarregandoCotacao(false);
      });
  }, [modalAberto]);

  // Fechar com tecla Esc (não fecha se o envio estiver pendente)
  useEffect(() => {
    if (!modalAberto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) {
        setModalAberto(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalAberto, pending]);

  const fecharModal = () => {
    if (pending) return;
    setModalAberto(false);
  };

  // pré-visualização; o valor oficial é da API
  function calcularPrevia(qtd: number, preco: number): { total: number; sacasCpr: number } | null {
    if (!Number.isFinite(qtd) || qtd <= 0 || !Number.isFinite(preco) || preco <= 0) {
      return null;
    }
    const total = Number((qtd * preco).toFixed(4));
    const sacasCpr = Math.ceil(total);
    if (total <= 0) return null;
    return { total, sacasCpr };
  }

  const previa = calcularPrevia(Number(quantidade), precoSacas);

  const enviarProposta = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!account) {
      notify.error("Conecte sua carteira primeiro.");
      return;
    }
    const quantidadeComprada = Number(quantidade);
    if (!Number.isFinite(quantidadeComprada) || quantidadeComprada <= 0 || !safra || !tipoCafe) {
      notify.error("Informe quantidade, safra e tipo de café.");
      return;
    }

    let toastId: string | undefined;
    try {
      setPending(true);
      toastId = notify.loading("Enviando proposta ao fornecedor...");
      const response = await fetch("http://localhost:3001/propostas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produtorWallet: account.address,
          fornecedorWallet,
          assetId,
          quantidadeComprada,
          safra,
          tipoCafe,
        }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? "Não foi possível enviar a proposta.");
      setSuccess(true);
      setModalAberto(false);
      const mensagemSucesso =
        body?.sacas_cpr != null
          ? `Proposta enviada: ${body.sacas_cpr} sacas na CPR.`
          : "Proposta enviada ao fornecedor.";
      notify.success(mensagemSucesso, toastId);
    } catch (error) {
      notify.fromError(error, toastId);
    } finally {
      setPending(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 font-semibold text-emerald-700 text-sm">
        Proposta enviada e aguardando resposta.
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalAberto(true)}
        className="rounded-xl bg-emerald-900 px-5 py-3 font-bold text-white hover:bg-emerald-950 transition-colors shadow-sm"
      >
        Fazer proposta
      </button>

      {montado &&
        modalAberto &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                fecharModal();
              }
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-checkout-titulo"
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 md:p-8 relative max-h-[90vh] overflow-y-auto"
            >
              {/* Cabeçalho do modal */}
              <div className="mb-6">
                <h2 id="modal-checkout-titulo" className="text-2xl font-bold text-emerald-950">
                  Checkout da proposta
                </h2>
                <p className="text-gray-500 text-sm mt-1">
                  {nomeInsumo ? `${nomeInsumo} • Unidade: ${unidadeMedida}` : `Unidade: ${unidadeMedida}`}
                </p>
              </div>

              {/* Formulário */}
              <form onSubmit={enviarProposta} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Quantidade (em {unidadeMedida})
                  </label>
                  <input
                    ref={quantidadeInputRef}
                    type="number"
                    min="0.000001"
                    step="any"
                    required
                    value={quantidade}
                    onChange={(e) => setQuantidade(e.target.value)}
                    placeholder="Ex: 10"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Safra
                  </label>
                  <input
                    type="text"
                    required
                    value={safra}
                    onChange={(e) => setSafra(e.target.value)}
                    placeholder="2026/2027"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Tipo de café
                  </label>
                  <input
                    type="text"
                    required
                    value={tipoCafe}
                    onChange={(e) => setTipoCafe(e.target.value)}
                    placeholder="Ex: Arábica Tipo 6 Bebida Dura"
                    className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all text-gray-900"
                  />
                </div>

                {/* Bloco de conversão */}
                {previa && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950 space-y-1">
                    <p className="font-medium">
                      {Number(quantidade).toLocaleString("pt-BR")} {unidadeMedida} ×{" "}
                      {precoSacas.toLocaleString("pt-BR")} sacas ={" "}
                      <span className="font-bold">{previa.total.toLocaleString("pt-BR")} sacas</span>
                    </p>
                    {previa.sacasCpr !== previa.total && (
                      <p className="text-emerald-700">
                        Será registrado na CPR:{" "}
                        <span className="font-bold">{previa.sacasCpr.toLocaleString("pt-BR")} sacas</span> (arredondado para cima)
                      </p>
                    )}
                  </div>
                )}

                {/* Bloco de cotação */}
                <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-xs space-y-1 text-blue-950">
                  {carregandoCotacao ? (
                    <p className="text-gray-500">Consultando cotação...</p>
                  ) : erroCotacao || cotacaoCafe === null ? (
                    <p className="text-gray-500">Cotação indisponível no momento.</p>
                  ) : (
                    <>
                      <p className="font-medium text-blue-900">
                        Cotação atual do café (KC=F): US${" "}
                        {cotacaoCafe.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        por saca
                      </p>
                      {previa && (
                        <p className="text-blue-950 font-semibold">
                          Valor de referência da troca: US${" "}
                          {(previa.sacasCpr * cotacaoCafe).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Botões do modal */}
                <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={fecharModal}
                    disabled={pending}
                    className="px-6 py-4 rounded-2xl border border-gray-200 bg-white font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pending || !account || !previa}
                    className="flex-1 px-8 py-4 bg-emerald-900 hover:bg-emerald-950 font-bold text-white rounded-2xl shadow-xl shadow-emerald-900/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {pending ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      "Confirmar proposta"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
