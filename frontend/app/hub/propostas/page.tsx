"use client";

import { useCallback, useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import {
  createThirdwebClient,
  getContract,
  parseEventLogs,
  prepareContractCall,
  prepareEvent,
  sendTransaction,
} from "thirdweb";
import { smartBarterLocalChain } from "@/lib/smartBarterChain";
import UsuarioDisplay from "@/components/UsuarioDisplay";
import ReputacaoEstrelas from "@/components/ReputacaoEstrelas";
import { notify } from "@/lib/notify";

const API_BASE_URL = "http://localhost:3001";
const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const client = createThirdwebClient({
  clientId:
    process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID ||
    "d3690d56bdafa6a3cd84d948259dbbe0",
});
const contract = getContract({
  client,
  chain: smartBarterLocalChain,
  address: CONTRACT_ADDRESS,
});

type Proposta = {
  id: string;
  produtor_wallet: string;
  quantidade_comprada: number;
  safra: string;
  tipo_cafe: string;
  assets?: { nome: string; descricao: string; preco_sacas: number };
};

const cprEmittedEvent = prepareEvent({
  signature:
    "event CPREmitida(uint256 indexed tokenId, address indexed produtor, address indexed fornecedor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain)",
});

async function readReceipt(hash: string) {
  const response = await fetch("http://127.0.0.1:8545", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: "eth_getTransactionReceipt",
      params: [hash],
    }),
  });
  if (!response.ok) throw new Error("Não foi possível consultar o RPC local.");
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message ?? "Erro no RPC local.");
  if (!payload.result) throw new Error("A transação ainda não foi confirmada.");
  if (payload.result.status !== "0x1") throw new Error("A emissão da CPR foi revertida.");
  return payload.result;
}

async function getTokenId(hash: string) {
  const receipt = await readReceipt(hash);
  const events = parseEventLogs({
    logs: receipt.logs ?? [],
    events: [cprEmittedEvent],
  });
  const tokenId = events[0]?.args?.tokenId;
  if (tokenId === undefined) {
    throw new Error("Recibo confirmado, mas o evento CPREmitida não foi encontrado.");
  }
  return tokenId;
}

function BotaoAceitar({
  proposta,
  onSuccess,
}: {
  proposta: Proposta;
  onSuccess: () => void;
}) {
  const account = useActiveAccount();
  const [pending, setPending] = useState(false);

  const aceitar = async () => {
    if (!account) {
      notify.error("Carteira não conectada.");
      return;
    }

    let toastId: string | undefined;
    try {
      setPending(true);
      toastId = notify.loading("Emitindo CPR na blockchain...");
      const quantidade = BigInt(Math.round(Number(proposta.quantidade_comprada)));
      if (quantidade <= BigInt(0)) throw new Error("Quantidade inválida.");

      const transaction = prepareContractCall({
        contract,
        method:
          "function emitirCPR(address produtor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain)",
        params: [
          proposta.produtor_wallet as `0x${string}`,
          quantidade,
          proposta.assets?.nome ?? "Insumo",
          `${proposta.quantidade_comprada} unidades`,
          proposta.safra,
          proposta.tipo_cafe,
          proposta.id,
        ],
      });
      const result = await sendTransaction({ transaction, account });
      const tokenId = await getTokenId(result.transactionHash);

      notify.loading("Salvando aceite no backend...", toastId);
      const response = await fetch(`${API_BASE_URL}/propostas/${proposta.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fornecedorWallet: account.address,
          status: "Aceita",
          tokenId: Number(tokenId),
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "A CPR foi emitida, mas o aceite não foi salvo.");
      }
      notify.success(`Proposta aceita. CPR #${tokenId.toString()} emitida.`, toastId);
      onSuccess();
    } catch (error) {
      notify.fromError(error, toastId);
    } finally {
      setPending(false);
    }
  };

  return (
    <button
      onClick={aceitar}
      disabled={pending}
      className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md disabled:opacity-70 disabled:cursor-wait"
    >
      {pending ? "Processando..." : "Emitir CPR e aceitar"}
    </button>
  );
}

export default function PropostasPage() {
  const account = useActiveAccount();
  const [propostas, setPropostas] = useState<Proposta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!account?.address) return;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({
        fornecedorWallet: account.address,
        status: "Pendente",
      });
      const response = await fetch(`${API_BASE_URL}/propostas?${query}`);
      if (!response.ok) throw new Error("Falha ao consultar propostas.");
      setPropostas(await response.json());
    } catch (err) {
      console.warn("Erro ao carregar propostas:", err);
      setError("Não foi possível carregar as propostas pendentes.");
    } finally {
      setLoading(false);
    }
  }, [account?.address]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return (
    <div className="max-w-6xl mx-auto py-12 px-6">
      <div className="bg-[#0A1A14] text-white rounded-3xl p-8 mb-10 shadow-xl flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-3xl font-serif font-bold mb-2">Painel de Propostas</h1>
          <p className="text-emerald-100/80 text-sm">
            Propostas pendentes recebidas pelos seus insumos.
          </p>
        </div>
        {account && (
          <div className="inline-flex items-center gap-3 bg-white/10 border border-white/20 px-5 py-3 rounded-2xl">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse" />
            <UsuarioDisplay address={account.address} showIcon={false} />
          </div>
        )}
      </div>

      {!account ? (
        <div className="bg-white rounded-3xl border border-emerald-100 p-12 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Autenticação Necessária</h2>
          <p className="text-gray-500 mb-8">Conecte sua carteira para ver propostas.</p>
          <a href="/cadastro" className="inline-flex bg-emerald-600 text-white font-bold py-3 px-8 rounded-xl">
            Ir para o Login Web3
          </a>
        </div>
      ) : (
        <section>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🏭 Propostas Pendentes de Aceite</h2>
          {loading ? (
            <div className="text-center py-12">Buscando propostas pendentes...</div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-3xl p-8 text-center">
              <p>{error}</p>
              <button onClick={carregar} className="mt-4 font-bold underline">Tentar novamente</button>
            </div>
          ) : propostas.length === 0 ? (
            <div className="bg-white/50 border border-dashed border-gray-300 rounded-3xl p-10 text-center text-gray-500">
              Não há propostas pendentes.
            </div>
          ) : (
            <div className="grid gap-6">
              {propostas.map((proposta) => (
                <div key={proposta.id} className="bg-white rounded-3xl shadow-sm border border-emerald-100 p-6 flex flex-col md:flex-row justify-between gap-6">
                  <div>
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold uppercase px-3 py-1 rounded-full">
                      Pendente
                    </span>
                    <h3 className="text-xl font-bold text-gray-900 mt-3">
                      {proposta.assets?.nome ?? "Insumo"}
                    </h3>
                    <p className="text-emerald-700 font-semibold mt-1">
                      {proposta.quantidade_comprada} unidades · Safra {proposta.safra} · {proposta.tipo_cafe}
                    </p>
                    <div className="bg-gray-50 rounded-xl p-3 mt-4">
                      <span className="text-xs text-gray-500 font-bold uppercase">Produtor: </span>
                      <UsuarioDisplay address={proposta.produtor_wallet} showIcon={false} />
                      <ReputacaoEstrelas carteira={proposta.produtor_wallet} />
                    </div>
                  </div>
                  <div className="flex items-center">
                    <BotaoAceitar proposta={proposta} onSuccess={carregar} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
