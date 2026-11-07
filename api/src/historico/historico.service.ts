import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';

export type EventoHistorico =
  | 'PROPOSTA_CRIADA'
  | 'PROPOSTA_ACEITA'
  | 'PROPOSTA_RECUSADA'
  | 'CPR_EMITIDA'
  | 'ENTREGA_CONFIRMADA'
  | 'CPR_LIQUIDADA';

export interface NovoRegistroHistorico {
  evento: EventoHistorico;
  ocorridoEm: Date;
  chainEpoch?: string | null;
  txHash?: string | null;
  logIndex?: number | null;
  blockNumber?: bigint | null;
  tokenId?: bigint | number | null;
  propostaId?: string | null;
  produtorWallet?: string | null;
  fornecedorWallet?: string | null;
  atorWallet?: string | null;
  sacas?: bigint | number | null;
  snapshot?: Record<string, unknown>;
}

export interface ConsultaHistoricoParams {
  wallet?: string;
  evento?: EventoHistorico;
  ambiente?: string;
  limit: number;
  offset: number;
}

export interface EventoReputacaoLinha {
  evento: EventoHistorico;
  proposta_id: string | null;
  chain_epoch: string | null;
  token_id: string | number | null;
}

@Injectable()
export class HistoricoService {
  private readonly logger = new Logger(HistoricoService.name);
  private warnedAmbiente = false;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  ambiente(): string {
    const amb = this.configService.get<string>('AMBIENTE');
    if (!amb) {
      if (!this.warnedAmbiente) {
        this.logger.warn('Variável AMBIENTE não definida. Usando padrão "local".');
        this.warnedAmbiente = true;
      }
      return 'local';
    }
    return amb;
  }

  private sanitizarSnapshot(snapshot?: Record<string, unknown>): Record<string, unknown> {
    if (!snapshot) return {};
    return JSON.parse(
      JSON.stringify(snapshot, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  private mapearLinha(registro: NovoRegistroHistorico) {
    return {
      ambiente: this.ambiente(),
      evento: registro.evento,
      ocorrido_em: registro.ocorridoEm.toISOString(),
      chain_epoch: registro.chainEpoch ?? null,
      tx_hash: registro.txHash ?? null,
      log_index: registro.logIndex ?? null,
      block_number:
        registro.blockNumber !== undefined && registro.blockNumber !== null
          ? registro.blockNumber.toString()
          : null,
      token_id:
        registro.tokenId !== undefined && registro.tokenId !== null
          ? registro.tokenId.toString()
          : null,
      proposta_id: registro.propostaId ?? null,
      produtor_wallet: registro.produtorWallet ? registro.produtorWallet.toLowerCase() : null,
      fornecedor_wallet: registro.fornecedorWallet ? registro.fornecedorWallet.toLowerCase() : null,
      ator_wallet: registro.atorWallet ? registro.atorWallet.toLowerCase() : null,
      sacas:
        registro.sacas !== undefined && registro.sacas !== null
          ? registro.sacas.toString()
          : null,
      snapshot: this.sanitizarSnapshot(registro.snapshot),
    };
  }

  async registrar(registro: NovoRegistroHistorico): Promise<void> {
    try {
      const linha = this.mapearLinha(registro);
      const { error } = await this.supabaseService
        .getClient()
        .from('historico_transacoes')
        .insert(linha);

      if (error) {
        if (error.code === '23505') {
          return;
        }
        this.logger.error(
          `Erro ao registrar histórico off-chain: ${error.message} (code: ${error.code})`,
        );
      }
    } catch (err: any) {
      this.logger.error(`Exceção ao registrar histórico off-chain: ${err?.message ?? err}`);
    }
  }

  async registrarOnChain(registros: NovoRegistroHistorico[]): Promise<void> {
    if (!registros || registros.length === 0) {
      return;
    }

    const linhas = registros.map((r) => this.mapearLinha(r));
    const { error } = await this.supabaseService
      .getClient()
      .from('historico_transacoes')
      .upsert(linhas, {
        onConflict: 'chain_epoch,tx_hash,log_index',
        ignoreDuplicates: true,
      });

    if (error) {
      this.logger.error(
        `Erro ao registrar histórico on-chain: ${error.message} (code: ${error.code})`,
      );
      throw error;
    }
  }

  async ultimoBlocoDoEpoch(chainEpoch: string): Promise<bigint | null> {
    try {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('historico_transacoes')
        .select('block_number')
        .eq('chain_epoch', chainEpoch)
        .order('block_number', { ascending: false })
        .limit(1);

      if (error) {
        this.logger.error(
          `Erro ao consultar último bloco do epoch: ${error.message} (code: ${error.code})`,
        );
        return null;
      }

      if (
        !data ||
        data.length === 0 ||
        data[0].block_number === null ||
        data[0].block_number === undefined
      ) {
        return null;
      }

      return BigInt(String(data[0].block_number));
    } catch (err: any) {
      this.logger.error(`Exceção ao consultar último bloco do epoch: ${err?.message ?? err}`);
      return null;
    }
  }

  async listar(params: ConsultaHistoricoParams) {
    const { wallet, evento, ambiente, limit, offset } = params;

    let query = this.supabaseService
      .getClient()
      .from('historico_transacoes')
      .select('*');

    if (wallet) {
      const w = wallet.toLowerCase();
      query = query.or(`produtor_wallet.eq.${w},fornecedor_wallet.eq.${w},ator_wallet.eq.${w}`);
    }

    if (evento) {
      query = query.eq('evento', evento);
    }

    if (ambiente) {
      query = query.eq('ambiente', ambiente);
    }

    query = query
      .order('ocorrido_em', { ascending: false })
      .order('registrado_em', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) {
      this.logger.error(
        `Erro ao listar histórico: ${error.message} (code: ${error.code})`,
      );
      throw new InternalServerErrorException('Erro ao consultar histórico de transações.');
    }

    return data ?? [];
  }

  async eventosParaReputacao(
    fornecedorWallet: string,
  ): Promise<EventoReputacaoLinha[]> {
    const carteira = fornecedorWallet.toLowerCase();
    const eventosFiltro = [
      'PROPOSTA_ACEITA',
      'PROPOSTA_RECUSADA',
      'CPR_EMITIDA',
      'CPR_LIQUIDADA',
    ];

    const todosEventos: EventoReputacaoLinha[] = [];
    const TAMANHO_PAGINA = 1000;
    let offset = 0;

    while (true) {
      const { data, error } = await this.supabaseService
        .getClient()
        .from('historico_transacoes')
        .select('evento, proposta_id, chain_epoch, token_id')
        .eq('fornecedor_wallet', carteira)
        .in('evento', eventosFiltro)
        .order('id', { ascending: true })
        .range(offset, offset + TAMANHO_PAGINA - 1);

      if (error) {
        this.logger.error(
          `Erro ao consultar eventos para reputação: ${error.message} (code: ${error.code})`,
        );
        throw new InternalServerErrorException(
          'Erro ao consultar o histórico para a reputação.',
        );
      }

      const linhas = (data as EventoReputacaoLinha[]) ?? [];
      todosEventos.push(...linhas);

      if (linhas.length < TAMANHO_PAGINA) {
        break;
      }

      offset += TAMANHO_PAGINA;
    }

    return todosEventos;
  }
}
