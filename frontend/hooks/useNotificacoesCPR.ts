import { useState, useEffect } from "react";
import { getContract, readContract, createThirdwebClient } from "thirdweb";
import { smartBarterLocalChain } from "@/lib/smartBarterChain";
import { fetchRawEvents } from "@/lib/blockchain-queries";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID || "d3690d56bdafa6a3cd84d948259dbbe0",
});

const CONTRACT_ADDRESS = "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853";

const myContract = getContract({
  client,
  chain: smartBarterLocalChain,
  address: CONTRACT_ADDRESS,
});

export interface Pendencia {
  id: string;
  tipo: "proposta_pendente_aceite" | "aguardando_insumo" | "cpr_pronta_liquidar";
  mensagem: string;
  link: string;
  isLida?: boolean;
}

export function useNotificacoesCPR(accountAddress: string | undefined) {
  const [total, setTotal] = useState(0); // Representa apenas o total de NÃO LIDAS
  const [detalhes, setDetalhes] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(false);

  const marcarTodasComoLidas = () => {
    if (!accountAddress) return;
    const lidasKey = `notificacoes_lidas_${accountAddress}`;
    const currentIds = detalhes.map((p) => p.id);
    localStorage.setItem(lidasKey, JSON.stringify(currentIds));
    
    setDetalhes((prev) => prev.map((p) => ({ ...p, isLida: true })));
    setTotal(0);
  };

  useEffect(() => {
    async function fetchNotificacoes() {
      if (!accountAddress) {
        setTotal(0);
        setDetalhes([]);
        return;
      }

      setLoading(true);
      try {
        const novasPendencias: Pendencia[] = [];

        // 1. EVENTOS PROPOSTACRIADA
        const propostasEvents = await fetchRawEvents(
          myContract.address,
          "event PropostaCriada(uint256 indexed propostaId, address indexed produtor, address indexed fornecedor, uint256 sacas, string insumo)"
        );

        for (const e of propostasEvents) {
          const pId = (e.args as any).propostaId;
          const isProdutor = (e.args as any).produtor?.toLowerCase() === accountAddress.toLowerCase();
          const isFornecedor = (e.args as any).fornecedor?.toLowerCase() === accountAddress.toLowerCase();

          if (pId !== undefined && (isProdutor || isFornecedor)) {
            const p = await readContract({
              contract: myContract,
              method: "function propostas(uint256) view returns (address produtor, address fornecedor, uint256 sacas, string insumo, bool ativa, bool pendente, bool insumoConfirmado)",
              params: [pId],
            });

            // Regra 1: Fornecedor - Propostas pendentes de aceite
            if (isFornecedor && p[5] === true) {
              novasPendencias.push({
                id: `proposta_pendente_${pId}`,
                tipo: "proposta_pendente_aceite",
                mensagem: `Nova proposta #${pId} de ${p[3]} aguardando seu aceite.`,
                link: "/hub/propostas",
              });
            }

            // Regra 2: Produtor - Propostas aguardando confirmação de insumo
            if (isProdutor && p[4] === true && p[6] === false) {
              novasPendencias.push({
                id: `aguardando_insumo_${pId}`,
                tipo: "aguardando_insumo",
                mensagem: `Proposta #${pId} de ${p[3]} aguarda que você confirme o recebimento do insumo.`,
                link: "/hub/propostas",
              });
            }
          }
        }

        // 2. EVENTOS CPREMITIDA
        const cprEvents = await fetchRawEvents(
          myContract.address,
          "event CPREmitida(uint256 indexed tokenId, address indexed fornecedor, uint256 sacas, string insumo)"
        );

        for (const e of cprEvents) {
          const tId = (e.args as any).tokenId;
          const isFornecedor = (e.args as any).fornecedor?.toLowerCase() === accountAddress.toLowerCase();

          if (tId !== undefined && isFornecedor) {
            const p = await readContract({
              contract: myContract,
              method: "function propostas(uint256) view returns (address produtor, address fornecedor, uint256 sacas, string insumo, bool ativa, bool pendente, bool insumoConfirmado)",
              params: [tId], // o tokenId é igual ao propostaId na lógica atual
            });

            // Regra 3: Fornecedor - CPRs ativas prontas pra liquidar
            if (p[4] === true) {
              novasPendencias.push({
                id: `cpr_pronta_liquidar_${tId}`,
                tipo: "cpr_pronta_liquidar",
                mensagem: `Você tem uma CPR ativa #${tId} de ${p[3]} pronta para liquidação.`,
                link: "/hub/meus-ativos",
              });
            }
          }
        }

        // --- Sincronização com LocalStorage (Lidas/Não Lidas e Cleanup) ---
        const lidasKey = `notificacoes_lidas_${accountAddress}`;
        const lidasRaw = localStorage.getItem(lidasKey);
        let lidasSet = new Set<string>();
        if (lidasRaw) {
          try {
            lidasSet = new Set(JSON.parse(lidasRaw));
          } catch (e) {
            console.error("Erro ao fazer parse do localStorage", e);
          }
        }

        const currentIdsSet = new Set(novasPendencias.map((p) => p.id));
        let hasChanges = false;
        
        // Remove IDs órfãos (que não existem mais ativamente na blockchain)
        for (const id of lidasSet) {
          if (!currentIdsSet.has(id)) {
            lidasSet.delete(id);
            hasChanges = true;
          }
        }

        if (hasChanges) {
          localStorage.setItem(lidasKey, JSON.stringify(Array.from(lidasSet)));
        }

        let naoLidasCount = 0;
        const pendenciasFinais = novasPendencias.map((p) => {
          const isLida = lidasSet.has(p.id);
          if (!isLida) {
            naoLidasCount++;
          }
          return { ...p, isLida };
        });

        setDetalhes(pendenciasFinais);
        setTotal(naoLidasCount);
      } catch (error) {
        console.error("Erro ao buscar notificações:", error);
      } finally {
        setLoading(false);
      }
    }

    // Polling simples ou apenas busca on mount
    fetchNotificacoes();
    const intervalId = setInterval(fetchNotificacoes, 30000); // Atualiza a cada 30s
    return () => clearInterval(intervalId);
  }, [accountAddress]);

  return { total, detalhes, loading, marcarTodasComoLidas };
}
