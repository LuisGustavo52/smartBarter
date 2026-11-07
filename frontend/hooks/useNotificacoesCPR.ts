import { useEffect, useState } from "react";
import { createThirdwebClient, getContract, readContract } from "thirdweb";
import { smartBarterLocalChain } from "@/lib/smartBarterChain";
import { fetchRawEvents } from "@/lib/blockchain-queries";
import { CONTRACT_ADDRESS } from "@/lib/config";

const API = "http://localhost:3001";
const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "d3690d56bdafa6a3cd84d948259dbbe0",
});
const contract = getContract({ client, chain: smartBarterLocalChain, address: CONTRACT_ADDRESS });

export interface Pendencia {
  id: string;
  tipo: "proposta_pendente_aceite" | "aguardando_insumo" | "cpr_pronta_liquidar";
  mensagem: string;
  link: string;
  isLida?: boolean;
}

export function useNotificacoesCPR(accountAddress: string | undefined) {
  const [total, setTotal] = useState(0);
  const [detalhes, setDetalhes] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(false);

  const marcarTodasComoLidas = () => {
    if (!accountAddress) return;
    const key = `notificacoes_lidas_${accountAddress.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(detalhes.map((item) => item.id)));
    setDetalhes((items) => items.map((item) => ({ ...item, isLida: true })));
    setTotal(0);
  };

  useEffect(() => {
    if (!accountAddress) {
      setDetalhes([]);
      setTotal(0);
      return;
    }

    let isCancelled = false;
    let isFirstLoad = true;

    const carregar = async () => {
      if (isFirstLoad) {
        setLoading(true);
      }
      try {
        const items: Pendencia[] = [];
        const userResponse = await fetch(`${API}/users/wallet/${accountAddress}`);
        const payload = userResponse.ok ? await userResponse.json() : null;
        const tipoUsuario = payload?.user?.tipo_usuario?.toUpperCase();

        if (tipoUsuario === "FORNECEDOR") {
          const response = await fetch(`${API}/propostas?fornecedorWallet=${accountAddress}&status=Pendente`);
          if (response.ok) {
            const propostas = await response.json();
            propostas.forEach((proposta: { id: string; assets?: { nome: string } }) =>
              items.push({
                id: `proposta_${proposta.id}`,
                tipo: "proposta_pendente_aceite",
                mensagem: `Nova proposta de ${proposta.assets?.nome ?? "insumo"} aguardando aceite.`,
                link: "/hub/propostas",
              })
            );
          }
        }

        const events = await fetchRawEvents(
          contract.address,
          "event CPREmitida(uint256 indexed tokenId, address indexed produtor, address indexed fornecedor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain)"
        );

        for (const event of events) {
          const tokenId = event.args.tokenId as bigint;
          const cpr = (await readContract({
            contract,
            method:
              "function cprs(uint256) view returns (address produtor, address fornecedor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain, bool aguardandoEntrega, bool entregue, bool liquidada)",
            params: [tokenId],
          })) as readonly [
            string,
            string,
            bigint,
            string,
            string,
            string,
            string,
            string,
            boolean,
            boolean,
            boolean
          ];

          const idOffchain = cpr[7] || tokenId.toString();
          if (cpr[0].toLowerCase() === accountAddress.toLowerCase() && cpr[8]) {
            items.push({
              id: `entrega_${idOffchain}`,
              tipo: "aguardando_insumo",
              mensagem: `A CPR #${tokenId} aguarda confirmação de entrega.`,
              link: "/hub/propostas",
            });
          }
          if (cpr[1].toLowerCase() === accountAddress.toLowerCase() && cpr[9] && !cpr[10]) {
            items.push({
              id: `liquidar_${idOffchain}`,
              tipo: "cpr_pronta_liquidar",
              mensagem: `A CPR #${tokenId} está pronta para liquidação.`,
              link: "/hub/propostas",
            });
          }
        }

        if (isCancelled) return;

        const key = `notificacoes_lidas_${accountAddress.toLowerCase()}`;
        const lidas = new Set<string>(JSON.parse(localStorage.getItem(key) ?? "[]"));
        setDetalhes(items.map((item) => ({ ...item, isLida: lidas.has(item.id) })));
        setTotal(items.filter((item) => !lidas.has(item.id)).length);
      } catch (error) {
        console.warn("Erro ao carregar notificações:", error);
      } finally {
        if (!isCancelled && isFirstLoad) {
          setLoading(false);
          isFirstLoad = false;
        }
      }
    };

    carregar();
    const intervalId = setInterval(carregar, 30000);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
    };
  }, [accountAddress]);

  return { total, detalhes, loading, marcarTodasComoLidas };
}
