export interface LinhaHistoricoReputacao {
  evento: string;
  proposta_id: string | null;
  chain_epoch: string | null;
  token_id: string | number | null;
}

export interface ContagemReputacao {
  propostasAceitas: number;
  propostasRecusadas: number;
  cprsLiquidadas: number;
}

export function obterChaveLinha(linha: LinhaHistoricoReputacao): string | null {
  if (linha.proposta_id) {
    return linha.proposta_id;
  }
  if (
    linha.chain_epoch !== null &&
    linha.chain_epoch !== undefined &&
    linha.token_id !== null &&
    linha.token_id !== undefined
  ) {
    return `${linha.chain_epoch}:${linha.token_id}`;
  }
  return null;
}

export function contarReputacao(
  linhas: LinhaHistoricoReputacao[],
): ContagemReputacao {
  const chavesAceitas = new Set<string>();
  const chavesRecusadas = new Set<string>();
  const chavesLiquidadas = new Set<string>();

  for (const linha of linhas) {
    const chave = obterChaveLinha(linha);
    if (!chave) continue;

    if (
      linha.evento === 'PROPOSTA_ACEITA' ||
      linha.evento === 'CPR_EMITIDA' ||
      linha.evento === 'CPR_LIQUIDADA'
    ) {
      chavesAceitas.add(chave);
    }

    if (linha.evento === 'PROPOSTA_RECUSADA') {
      chavesRecusadas.add(chave);
    }

    if (linha.evento === 'CPR_LIQUIDADA') {
      chavesLiquidadas.add(chave);
    }
  }

  return {
    propostasAceitas: chavesAceitas.size,
    propostasRecusadas: chavesRecusadas.size,
    cprsLiquidadas: chavesLiquidadas.size,
  };
}
