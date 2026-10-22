"use client";

import { useCallback, useEffect, useState } from "react";
import { useActiveAccount } from "thirdweb/react";
import { createThirdwebClient, getContract, parseEventLogs, prepareContractCall, prepareEvent, readContract, sendTransaction } from "thirdweb";
import { smartBarterLocalChain } from "@/lib/smartBarterChain";
import { fetchRawEvents } from "@/lib/blockchain-queries";
import UsuarioDisplay from "@/components/UsuarioDisplay";
import ReputacaoEstrelas from "@/components/ReputacaoEstrelas";
import BotaoConfirmarInsumo from "@/components/BotaoConfirmarInsumo";
import BotaoLiquidarCPR from "@/components/BotaoLiquidarCPR";
import { notify } from "@/lib/notify";
import { CONTRACT_ADDRESS } from "@/lib/config";

const API_BASE_URL = "http://localhost:3001";
const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "d3690d56bdafa6a3cd84d948259dbbe0" });
const contract = getContract({ client, chain: smartBarterLocalChain, address: CONTRACT_ADDRESS });
const EVENT_SIGNATURE = "event CPREmitida(uint256 indexed tokenId, address indexed produtor, address indexed fornecedor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain)";
const emittedEvent = prepareEvent({ signature: EVENT_SIGNATURE });

type Proposta = {
  id: string;
  produtor_wallet: string;
  fornecedor_wallet: string;
  quantidade_comprada: number;
  safra: string;
  tipo_cafe: string;
  status: string;
  token_id?: number;
  preco_unitario_sacas?: number;
  total_sacas?: number;
  sacas_cpr?: number;
  assets?: { nome: string; preco_sacas?: number; unidade_medida?: string };
};
type Cpr = { tokenId: bigint; produtor: string; fornecedor: string; sacas: bigint; insumo: string; quantidadeInsumo: string; safra: string; tipoCafe: string; entregue: boolean; liquidada: boolean; donoAtual: string | null };

async function carregarCprs(wallet: string): Promise<Cpr[]> {
  const events = await fetchRawEvents(contract.address, EVENT_SIGNATURE);
  const result: Cpr[] = [];
  for (const event of events) {
    const tokenId = event.args.tokenId as bigint;
    const data = await readContract({
      contract,
      method: "function cprs(uint256) view returns (address produtor, address fornecedor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain, bool aguardandoEntrega, bool entregue, bool liquidada)",
      params: [tokenId],
    }) as readonly [string, string, bigint, string, string, string, string, string, boolean, boolean, boolean];
    const produtor = data[0];
    const fornecedor = data[1];
    if (produtor.toLowerCase() !== wallet.toLowerCase() && fornecedor.toLowerCase() !== wallet.toLowerCase()) continue;
    let donoAtual: string | null = null;
    try {
      donoAtual = await readContract({ contract, method: "function ownerOf(uint256) view returns (address)", params: [tokenId] }) as string;
    } catch {
      donoAtual = null;
    }
    result.push({ tokenId, produtor, fornecedor, sacas: data[2], insumo: data[3], quantidadeInsumo: data[4], safra: data[5], tipoCafe: data[6], entregue: data[9], liquidada: data[10], donoAtual });
  }
  return result.reverse();
}

async function obterTokenId(hash: string): Promise<bigint> {
  const response = await fetch("http://127.0.0.1:8545", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method: "eth_getTransactionReceipt", params: [hash] }) });
  const payload = await response.json();
  if (!response.ok || payload.error || !payload.result || payload.result.status !== "0x1") throw new Error("Não foi possível confirmar a emissão da CPR.");
  const events = parseEventLogs({ logs: payload.result.logs ?? [], events: [emittedEvent] });
  const tokenId = events[0]?.args?.tokenId;
  if (tokenId === undefined) throw new Error("Evento CPREmitida não encontrado.");
  return tokenId;
}

function sacasParaCpr(proposta: Proposta): number {
  if (proposta.sacas_cpr != null) {
    const sacas = Number(proposta.sacas_cpr);
    if (Number.isFinite(sacas) && sacas > 0) return sacas;
  }
  const preco = Number(proposta.assets?.preco_sacas);
  const qtd = Number(proposta.quantidade_comprada);
  if (Number.isFinite(preco) && preco > 0 && Number.isFinite(qtd) && qtd > 0) {
    const total = Number((qtd * preco).toFixed(4));
    const sacasCpr = Math.ceil(total);
    if (total > 0 && sacasCpr >= 1) return sacasCpr;
  }
  throw new Error("Não foi possível calcular as sacas desta proposta.");
}

function AceitarProposta({ proposta, onSuccess }: { proposta: Proposta; onSuccess: () => void }) {
  const account = useActiveAccount();
  const [pending, setPending] = useState(false);
  const aceitar = async () => {
    if (!account) return notify.error("Carteira não conectada.");
    let toastId: string | undefined;
    try {
      setPending(true); toastId = notify.loading("Emitindo CPR na blockchain...");
      const sacasCalculadas = sacasParaCpr(proposta);
      const tx = prepareContractCall({ contract, method: "function emitirCPR(address produtor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain)", params: [proposta.produtor_wallet as `0x${string}`, BigInt(sacasCalculadas), proposta.assets?.nome ?? "Insumo", `${proposta.quantidade_comprada} ${proposta.assets?.unidade_medida ?? "unidades"}`, proposta.safra, proposta.tipo_cafe, proposta.id] });
      const tokenId = await obterTokenId((await sendTransaction({ transaction: tx, account })).transactionHash);
      const response = await fetch(`${API_BASE_URL}/propostas/${proposta.id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fornecedorWallet: account.address, status: "Aceita", tokenId: Number(tokenId) }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.message ?? "A CPR foi emitida, mas o aceite não foi salvo.");
      notify.success(`Proposta aceita. CPR #${tokenId} emitida.`, toastId); onSuccess();
    } catch (error) { notify.fromError(error, toastId); } finally { setPending(false); }
  };
  return <button onClick={aceitar} disabled={pending} className="rounded-xl bg-emerald-600 px-5 py-2 font-bold text-white disabled:opacity-70">{pending ? "Processando..." : "Emitir CPR e aceitar"}</button>;
}

export default function PropostasPage() {
  const account = useActiveAccount();
  const [role, setRole] = useState<string>();
  const [pendentes, setPendentes] = useState<Proposta[]>([]);
  const [enviadas, setEnviadas] = useState<Proposta[]>([]);
  const [cprs, setCprs] = useState<Cpr[]>([]);
  const [loading, setLoading] = useState(false);

  const carregar = useCallback(async () => {
    if (!account?.address) return;
    setLoading(true);
    try {
      const userResponse = await fetch(`${API_BASE_URL}/users/wallet/${account.address}`);
      const payload = userResponse.ok ? await userResponse.json() : null;
      const user = payload?.user;
      setRole(user?.tipo_usuario);
      const params = new URLSearchParams(user?.tipo_usuario === "FORNECEDOR" ? { fornecedorWallet: account.address, status: "Pendente" } : { produtorWallet: account.address });
      const response = await fetch(`${API_BASE_URL}/propostas?${params}`);
      const propostas = response.ok ? await response.json() : [];
      if (user?.tipo_usuario === "FORNECEDOR") setPendentes(propostas);
      else setEnviadas(propostas);
      setCprs(await carregarCprs(account.address));
    } catch (error) {
      console.warn("Erro ao carregar propostas e CPRs:", error);
      notify.error("Não foi possível carregar seus contratos.");
    } finally { setLoading(false); }
  }, [account?.address]);

  useEffect(() => { carregar(); }, [carregar]);

  if (!account) return <div className="mx-auto max-w-6xl p-12 text-center"><h1 className="text-2xl font-bold">Conecte sua carteira para acessar seus contratos.</h1></div>;
  return (
    <div className="mx-auto max-w-6xl space-y-10 px-6 py-12">
      <header className="rounded-3xl bg-[#0A1A14] p-8 text-white"><h1 className="text-3xl font-serif font-bold">Propostas e contratos</h1><p className="mt-2 text-emerald-100/80"><UsuarioDisplay address={account.address} showIcon={false} /></p></header>
      {loading && <p className="text-center text-gray-500">Consultando backend e blockchain...</p>}
      {role === "FORNECEDOR" && <section><h2 className="mb-5 text-2xl font-bold">Propostas pendentes de aceite</h2>{pendentes.length === 0 ? <Empty text="Não há propostas pendentes." /> : <div className="grid gap-4">{pendentes.map((p) => <article key={p.id} className="flex flex-col justify-between gap-4 rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm md:flex-row"><div><span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Pendente</span><h3 className="mt-3 text-xl font-bold">{p.assets?.nome ?? "Insumo"}</h3><p className="text-emerald-700">{p.quantidade_comprada} {p.assets?.unidade_medida ?? "unidades"} · Safra {p.safra} · {p.tipo_cafe}{p.sacas_cpr != null ? ` · Total na CPR: ${p.sacas_cpr} sacas` : ""}</p><UsuarioDisplay address={p.produtor_wallet} showIcon={false} /><ReputacaoEstrelas carteira={p.produtor_wallet} /></div><AceitarProposta proposta={p} onSuccess={carregar} /></article>)}</div>}</section>}
      {role === "PRODUTOR" && <section><h2 className="mb-5 text-2xl font-bold">Minhas propostas e respostas</h2>{enviadas.length === 0 ? <Empty text="Você ainda não enviou propostas." /> : <div className="grid gap-3">{enviadas.map((p) => <div key={p.id} className="rounded-2xl border bg-white p-4"><b>{p.assets?.nome ?? "Insumo"}</b><span className="ml-3 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold">{p.status}</span><p className="text-sm text-gray-600">{p.quantidade_comprada} {p.assets?.unidade_medida ?? "unidades"} · {p.safra} · {p.tipo_cafe}{p.sacas_cpr != null ? ` · Total na CPR: ${p.sacas_cpr} sacas` : ""}</p></div>)}</div>}</section>}
      <section><h2 className="mb-5 text-2xl font-bold">CPRs relacionadas à minha carteira</h2>{cprs.length === 0 ? <Empty text="Nenhuma CPR encontrada na blockchain." /> : <div className="grid gap-4 md:grid-cols-2">{cprs.map((cpr) => { const souProdutor = cpr.produtor.toLowerCase() === account.address.toLowerCase(); const podeLiquidar = cpr.donoAtual?.toLowerCase() === account.address.toLowerCase() && cpr.entregue && !cpr.liquidada; return <article key={cpr.tokenId.toString()} className="rounded-3xl border border-emerald-100 bg-white p-6 shadow-sm"><div className="flex justify-between"><h3 className="text-xl font-bold">CPR #{cpr.tokenId.toString()}</h3><span className={`rounded-full px-3 py-1 text-xs font-bold ${cpr.liquidada ? "bg-gray-100 text-gray-600" : cpr.entregue ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-800"}`}>{cpr.liquidada ? "Liquidada" : cpr.entregue ? "Entregue" : "Aguardando entrega"}</span></div><p className="mt-3 font-semibold">{cpr.insumo} · {cpr.quantidadeInsumo}</p><p className="text-sm text-gray-600">{cpr.sacas.toString()} sacas · Safra {cpr.safra} · {cpr.tipoCafe}</p><p className="mt-2 text-xs text-gray-500">Produtor: {cpr.produtor} · Fornecedor: {cpr.fornecedor}</p>{souProdutor && !cpr.entregue && !cpr.liquidada && <div className="mt-4"><BotaoConfirmarInsumo propostaId={cpr.tokenId} contract={contract} onSuccess={carregar} /></div>}{podeLiquidar && <div className="mt-4"><BotaoLiquidarCPR tokenId={cpr.tokenId} contract={contract} onSuccess={carregar} /></div>}</article>; })}</div>}</section>
    </div>
  );
}

function Empty({ text }: { text: string }) { return <div className="rounded-3xl border border-dashed border-gray-300 p-8 text-center text-gray-500">{text}</div>; }
