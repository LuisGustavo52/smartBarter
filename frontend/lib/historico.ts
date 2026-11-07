export type EventoHistorico =
  | "PROPOSTA_CRIADA"
  | "PROPOSTA_ACEITA"
  | "PROPOSTA_RECUSADA"
  | "CPR_EMITIDA"
  | "ENTREGA_CONFIRMADA"
  | "CPR_LIQUIDADA";

export const EVENTOS_HISTORICO: EventoHistorico[] = [
  "PROPOSTA_CRIADA",
  "PROPOSTA_ACEITA",
  "PROPOSTA_RECUSADA",
  "CPR_EMITIDA",
  "ENTREGA_CONFIRMADA",
  "CPR_LIQUIDADA",
];

export const EVENTO_LABELS: Record<EventoHistorico, string> = {
  PROPOSTA_CRIADA: "Proposta criada",
  PROPOSTA_ACEITA: "Proposta aceita",
  PROPOSTA_RECUSADA: "Proposta recusada",
  CPR_EMITIDA: "CPR emitida",
  ENTREGA_CONFIRMADA: "Entrega confirmada",
  CPR_LIQUIDADA: "CPR liquidada",
};

export interface HistoricoSnapshot {
  insumo?: string;
  quantidadeInsumo?: string;
  quantidadeComprada?: number | string;
  unidadeMedida?: string;
  safra?: string;
  tipoCafe?: string;
  precoUnitarioSacas?: number | string;
  totalSacas?: number | string;
  sacasCpr?: number | string;
  status?: string;
  [key: string]: unknown;
}

export interface HistoricoItem {
  id: string;
  ambiente: string;
  evento: EventoHistorico;
  ocorrido_em: string;
  chain_epoch: string | null;
  tx_hash: string | null;
  log_index: number | string | null;
  block_number: number | string | null;
  token_id: number | string | null;
  proposta_id: string | null;
  produtor_wallet: string | null;
  fornecedor_wallet: string | null;
  ator_wallet: string | null;
  sacas: number | string | null;
  snapshot: HistoricoSnapshot;
  registrado_em: string;
}

export interface CicloHistorico {
  id: string;
  propostaId: string | null;
  titulo: string;
  itens: HistoricoItem[];
  eventoMaisRecente: HistoricoItem;
}

export interface ResumoCiclo {
  insumo?: string;
  quantidade?: string;
  safra?: string;
  sacas?: string;
  papelUsuario?: "Produtor" | "Fornecedor" | null;
}

/**
 * Encurta carteiras e hashes mantendo prefixo e sufixo legíveis.
 * Exemplo: 0x1234...5678
 */
export function encurtar(valor?: string | null, n = 6): string {
  if (!valor) return "";
  const str = String(valor).trim();
  if (str.length <= n * 2) return str;
  return `${str.slice(0, n)}...${str.slice(-n)}`;
}

/**
 * Função pura que agrupa itens por proposta_id.
 * Itens sem proposta_id vão para o grupo "Outros eventos".
 * Ordena os eventos de cada ciclo por ocorrido_em crescente
 * e os ciclos pelo evento mais recente, decrescente.
 */
export function agruparPorCiclo(itens: HistoricoItem[]): CicloHistorico[] {
  if (!itens || itens.length === 0) return [];

  const OUTROS_CHAVE = "__OUTROS_EVENTOS__";
  const grupos = new Map<string, HistoricoItem[]>();

  for (const item of itens) {
    const chave =
      item.proposta_id && item.proposta_id.trim() !== ""
        ? item.proposta_id.trim()
        : OUTROS_CHAVE;

    const lista = grupos.get(chave);
    if (lista) {
      lista.push(item);
    } else {
      grupos.set(chave, [item]);
    }
  }

  const ciclos: CicloHistorico[] = [];

  for (const [chave, itensDoGrupo] of grupos.entries()) {
    // Clona para preservar pureza e ordena por ocorrido_em crescente
    const ordenados = [...itensDoGrupo].sort((a, b) => {
      const dataA = new Date(a.ocorrido_em).getTime();
      const dataB = new Date(b.ocorrido_em).getTime();
      return dataA - dataB;
    });

    const ehOutros = chave === OUTROS_CHAVE;
    const propostaId = ehOutros ? null : chave;
    const eventoMaisRecente = ordenados[ordenados.length - 1];

    ciclos.push({
      id: chave,
      propostaId,
      titulo: ehOutros ? "Outros eventos" : `Ciclo ${propostaId}`,
      itens: ordenados,
      eventoMaisRecente,
    });
  }

  // Ordena os ciclos pelo evento mais recente decrescente
  ciclos.sort((a, b) => {
    const dataA = new Date(a.eventoMaisRecente.ocorrido_em).getTime();
    const dataB = new Date(b.eventoMaisRecente.ocorrido_em).getTime();
    return dataB - dataA;
  });

  return ciclos;
}

/**
 * Extrai dados consolidados do ciclo para o cabeçalho do cartão.
 * Lê de snapshot.insumo, snapshot.quantidadeInsumo ou snapshot.quantidadeComprada,
 * snapshot.safra e do campo sacas. Omite o que não existir.
 * Compara a carteira conectada com produtor_wallet e fornecedor_wallet.
 */
export function extrairResumoCiclo(
  ciclo: CicloHistorico,
  carteiraConectada?: string | null
): ResumoCiclo {
  let insumo: string | undefined;
  let quantidade: string | undefined;
  let safra: string | undefined;
  let sacas: string | undefined;
  let papelUsuario: "Produtor" | "Fornecedor" | null = null;

  const carteira = carteiraConectada?.toLowerCase();

  for (const item of ciclo.itens) {
    const snap = item.snapshot || {};

    if (!insumo && typeof snap.insumo === "string" && snap.insumo.trim() !== "") {
      insumo = snap.insumo.trim();
    }

    if (!quantidade) {
      if (typeof snap.quantidadeInsumo === "string" && snap.quantidadeInsumo.trim() !== "") {
        quantidade = snap.quantidadeInsumo.trim();
      } else if (snap.quantidadeComprada !== undefined && snap.quantidadeComprada !== null) {
        const unidade = typeof snap.unidadeMedida === "string" && snap.unidadeMedida.trim() !== ""
          ? ` ${snap.unidadeMedida.trim()}`
          : "";
        quantidade = `${snap.quantidadeComprada}${unidade}`;
      }
    }

    if (!safra && typeof snap.safra === "string" && snap.safra.trim() !== "") {
      safra = snap.safra.trim();
    }

    if (!sacas) {
      if (item.sacas !== undefined && item.sacas !== null && String(item.sacas).trim() !== "") {
        sacas = String(item.sacas).trim();
      } else if (snap.sacas !== undefined && snap.sacas !== null && String(snap.sacas).trim() !== "") {
        sacas = String(snap.sacas).trim();
      } else if (snap.sacasCpr !== undefined && snap.sacasCpr !== null && String(snap.sacasCpr).trim() !== "") {
        sacas = String(snap.sacasCpr).trim();
      }
    }

    if (!papelUsuario && carteira) {
      if (item.produtor_wallet && item.produtor_wallet.toLowerCase() === carteira) {
        papelUsuario = "Produtor";
      } else if (item.fornecedor_wallet && item.fornecedor_wallet.toLowerCase() === carteira) {
        papelUsuario = "Fornecedor";
      }
    }
  }

  return { insumo, quantidade, safra, sacas, papelUsuario };
}
