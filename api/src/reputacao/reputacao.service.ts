import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  createPublicClient,
  http,
  parseAbi,
  isAddress,
  getAddress,
  defineChain,
  type Address,
  type PublicClient,
} from 'viem';
import { SupabaseService } from '../supabase/supabase.service';

export interface Reputacao {
  carteira: string;
  propostasAceitas: number;
  propostasRecusadas: number;
  cprsLiquidadas: number;
  scorePercentual: number | null;
  estrelas: number;
  classificacao: string;
}

const RPC_URL = process.env.RPC_URL ?? 'http://127.0.0.1:8545';

const hardhatLocal = defineChain({
  id: 31337,
  name: 'Hardhat',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: [RPC_URL] },
  },
});

const CONTRACT_ABI = parseAbi([
  'function cprs(uint256) view returns (address produtor, address fornecedor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain, bool aguardandoEntrega, bool entregue, bool liquidada)',
  'event CPREmitida(uint256 indexed tokenId, address indexed produtor, address indexed fornecedor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain)',
  'event CPRLiquidada(uint256 indexed tokenId)',
]);

@Injectable()
export class ReputacaoService {
  private readonly logger = new Logger(ReputacaoService.name);
  private client: PublicClient | null = null;

  constructor(private readonly supabaseService: SupabaseService) {}

  private getClient(): PublicClient {
    if (!this.client) {
      this.client = createPublicClient({
        chain: hardhatLocal,
        transport: http(RPC_URL),
      });
    }
    return this.client;
  }

  async getReputacao(carteira: string): Promise<Reputacao> {
    if (!isAddress(carteira)) {
      throw new BadRequestException('Carteira inválida.');
    }

    const contractAddress = process.env.CONTRACT_ADDRESS as Address | undefined;
    if (!contractAddress || !isAddress(contractAddress)) {
      this.logger.error('CONTRACT_ADDRESS ausente ou inválido no .env da API.');
      throw new InternalServerErrorException(
        'Contrato não configurado. Defina CONTRACT_ADDRESS no .env da API.',
      );
    }

    const fornecedor = getAddress(carteira);
    const client = this.getClient();
    const logFilter = {
      address: contractAddress,
      fromBlock: 0n,
      toBlock: 'latest' as const,
    };

    try {
      const { data: propostas, error: propostasError } =
        await this.supabaseService
          .getClient()
          .from('propostas')
          .select('status')
          .ilike('fornecedor_wallet', carteira);
      if (propostasError) {
        throw new InternalServerErrorException('Erro ao buscar o histórico de propostas.');
      }

      const logsEmitidas = await client.getLogs({
        ...logFilter,
        event: CONTRACT_ABI[1],
        args: { fornecedor },
      });
      const logsLiquidadas = await client.getLogs({
        ...logFilter,
        event: CONTRACT_ABI[2],
      });

      this.logger.log(
        `Histórico: propostas=${propostas.length} emitidas=${logsEmitidas.length} liquidadas=${logsLiquidadas.length}`,
      );

      const propostasAceitas = propostas.filter(
        (proposta) => proposta.status === 'Aceita',
      ).length;
      const propostasRecusadas = propostas.filter(
        (proposta) => proposta.status === 'Recusada',
      ).length;

      let cprsLiquidadas = 0;
      for (const log of logsLiquidadas) {
        if (log.args.tokenId === undefined) continue;
        const cpr = await client.readContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: 'cprs',
          args: [log.args.tokenId],
        });
        if (cpr[1].toLowerCase() === fornecedor.toLowerCase()) {
          cprsLiquidadas += 1;
        }
      }

      void logsEmitidas;

      return this.montarResposta({
        carteira: fornecedor,
        propostasAceitas,
        propostasRecusadas,
        cprsLiquidadas,
      });
    } catch (error: any) {
      if (
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }
      this.logger.error(`Falha ao consultar reputação on-chain: ${error.message}`);
      throw new InternalServerErrorException(
        'Falha ao buscar reputação na blockchain local.',
      );
    }
  }

  private montarResposta(base: {
    carteira: string;
    propostasAceitas: number;
    propostasRecusadas: number;
    cprsLiquidadas: number;
  }): Reputacao {
    const { propostasAceitas, cprsLiquidadas } = base;

    if (propostasAceitas === 0) {
      return {
        ...base,
        scorePercentual: null,
        estrelas: 3,
        classificacao: 'Sem histórico',
      };
    }

    const scorePercentual = Math.round((cprsLiquidadas / propostasAceitas) * 100);
    const { estrelas, classificacao } = this.classificar(scorePercentual);

    return {
      ...base,
      scorePercentual,
      estrelas,
      classificacao,
    };
  }

  private classificar(scorePercentual: number): {
    estrelas: number;
    classificacao: string;
  } {
    if (scorePercentual >= 90) return { estrelas: 5, classificacao: 'Excelente' };
    if (scorePercentual >= 70) return { estrelas: 4, classificacao: 'Confiável' };
    if (scorePercentual >= 40) return { estrelas: 3, classificacao: 'Regular' };
    if (scorePercentual >= 20)
      return { estrelas: 2, classificacao: 'Baixa confiabilidade' };
    return { estrelas: 1, classificacao: 'Risco alto' };
  }
}
