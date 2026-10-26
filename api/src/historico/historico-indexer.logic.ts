import type { NovoRegistroHistorico, EventoHistorico } from './historico.service';

export function ehUuid(valor: string): boolean {
  if (!valor || typeof valor !== 'string') return false;
  const uuidRegex =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  return uuidRegex.test(valor);
}

export function dividirIntervalo(
  de: bigint,
  ate: bigint,
  tamanho: bigint,
): Array<[bigint, bigint]> {
  if (de > ate || tamanho <= 0n) {
    return [];
  }

  const intervalos: Array<[bigint, bigint]> = [];
  let atual = de;

  while (atual <= ate) {
    let proximo = atual + tamanho - 1n;
    if (proximo > ate) {
      proximo = ate;
    }
    intervalos.push([atual, proximo]);
    atual = proximo + 1n;
  }

  return intervalos;
}

export function blocoInicial(
  ultimoRegistrado: bigint | null,
  cursorEmMemoria: bigint | null,
): bigint {
  if (cursorEmMemoria !== null && cursorEmMemoria !== undefined) {
    return cursorEmMemoria;
  }
  if (ultimoRegistrado !== null && ultimoRegistrado !== undefined) {
    return ultimoRegistrado;
  }
  return 0n;
}

export interface CprDados {
  produtor?: string;
  fornecedor?: string;
  sacas?: bigint | number;
  insumo?: string;
  quantidadeInsumo?: string;
  safra?: string;
  tipoCafe?: string;
  idPropostaOffchain?: string;
  aguardandoEntrega?: boolean;
  entregue?: boolean;
  liquidada?: boolean;
}

export interface MapearLogEntrada {
  eventName: string;
  args: any;
  txHash: string;
  logIndex: number;
  blockNumber: bigint;
  blockTimestamp: bigint | number;
  chainEpoch: string;
  ator?: string;
  cpr?: CprDados;
}

export function mapearLog(entrada: MapearLogEntrada): NovoRegistroHistorico {
  const {
    eventName,
    args,
    txHash,
    logIndex,
    blockNumber,
    blockTimestamp,
    chainEpoch,
    ator,
    cpr,
  } = entrada;

  const ocorridoEm = new Date(Number(blockTimestamp) * 1000);
  const atorWallet = ator;

  if (eventName === 'CPREmitida') {
    const idPropostaOffchainStr = args.idPropostaOffchain
      ? String(args.idPropostaOffchain)
      : '';
    const propostaId = ehUuid(idPropostaOffchainStr) ? idPropostaOffchainStr : undefined;

    return {
      evento: 'CPR_EMITIDA',
      ocorridoEm,
      chainEpoch,
      txHash,
      logIndex,
      blockNumber,
      tokenId: args.tokenId,
      propostaId,
      produtorWallet: args.produtor,
      fornecedorWallet: args.fornecedor,
      atorWallet,
      sacas: args.sacas,
      snapshot: {
        tokenId: args.tokenId !== undefined ? String(args.tokenId) : undefined,
        produtor: args.produtor,
        fornecedor: args.fornecedor,
        sacas: args.sacas !== undefined ? String(args.sacas) : undefined,
        insumo: args.insumo,
        quantidadeInsumo: args.quantidadeInsumo,
        safra: args.safra,
        tipoCafe: args.tipoCafe,
        idPropostaOffchain: args.idPropostaOffchain,
      },
    };
  }

  if (eventName === 'EntregaConfirmada' || eventName === 'CPRLiquidada') {
    const evento: EventoHistorico =
      eventName === 'EntregaConfirmada' ? 'ENTREGA_CONFIRMADA' : 'CPR_LIQUIDADA';

    if (cpr) {
      const idPropostaOffchainStr = cpr.idPropostaOffchain
        ? String(cpr.idPropostaOffchain)
        : '';
      const propostaId = ehUuid(idPropostaOffchainStr) ? idPropostaOffchainStr : undefined;

      return {
        evento,
        ocorridoEm,
        chainEpoch,
        txHash,
        logIndex,
        blockNumber,
        tokenId: args.tokenId,
        propostaId,
        produtorWallet: cpr.produtor,
        fornecedorWallet: cpr.fornecedor,
        atorWallet,
        sacas: cpr.sacas,
        snapshot: {
          tokenId: args.tokenId !== undefined ? String(args.tokenId) : undefined,
          produtor: cpr.produtor,
          fornecedor: cpr.fornecedor,
          sacas: cpr.sacas !== undefined ? String(cpr.sacas) : undefined,
          insumo: cpr.insumo,
          quantidadeInsumo: cpr.quantidadeInsumo,
          safra: cpr.safra,
          tipoCafe: cpr.tipoCafe,
          idPropostaOffchain: cpr.idPropostaOffchain,
          aguardandoEntrega: cpr.aguardandoEntrega,
          entregue: cpr.entregue,
          liquidada: cpr.liquidada,
        },
      };
    }

    return {
      evento,
      ocorridoEm,
      chainEpoch,
      txHash,
      logIndex,
      blockNumber,
      tokenId: args.tokenId,
      atorWallet,
      snapshot: {
        enriquecimento: 'indisponivel',
        tokenId: args.tokenId !== undefined ? String(args.tokenId) : undefined,
      },
    };
  }

  throw new Error(`Evento desconhecido para mapeamento de log: ${eventName}`);
}
