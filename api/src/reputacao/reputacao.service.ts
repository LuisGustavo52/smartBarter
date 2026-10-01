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
  isAddressEqual,
  getAddress,
  defineChain,
  type Address,
  type PublicClient,
} from 'viem';

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
  'function propostas(uint256) view returns (address produtor, address fornecedor, uint256 sacas, string insumo, bool ativa, bool pendente, bool insumoConfirmado)',
  'event PropostaAceita(uint256 indexed propostaId)',
  'event PropostaRecusada(uint256 indexed propostaId)',
  'event CPREmitida(uint256 indexed tokenId, address indexed fornecedor, uint256 sacas, string insumo)',
  'event CPRLiquidada(uint256 indexed tokenId)',
]);

@Injectable()
export class ReputacaoService {
  private readonly logger = new Logger(ReputacaoService.name);
  private client: PublicClient | null = null;

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
      const [logsAceitas, logsRecusadas, logsEmitidas, logsLiquidadas] =
        await Promise.all([
          client.getLogs({
            ...logFilter,
            event: CONTRACT_ABI[1],
          }),
          client.getLogs({
            ...logFilter,
            event: CONTRACT_ABI[2],
          }),
          client.getLogs({
            ...logFilter,
            event: CONTRACT_ABI[3],
            args: { fornecedor },
          }),
          client.getLogs({
            ...logFilter,
            event: CONTRACT_ABI[4],
          }),
        ]);

      this.logger.log(
        `Eventos brutos: aceitas=${logsAceitas.length} recusadas=${logsRecusadas.length} emitidas=${logsEmitidas.length} liquidadas=${logsLiquidadas.length}`,
      );

      const propostaCache = new Map<string, Address | null>();
      const fornecedorDaProposta = async (id: bigint): Promise<Address | null> => {
        const key = id.toString();
        if (propostaCache.has(key)) {
          return propostaCache.get(key) ?? null;
        }
        const proposta = await client.readContract({
          address: contractAddress,
          abi: CONTRACT_ABI,
          functionName: 'propostas',
          args: [id],
        });
        const endereco = proposta[1];
        if (endereco === '0x0000000000000000000000000000000000000000') {
          propostaCache.set(key, null);
          return null;
        }
        propostaCache.set(key, endereco);
        return endereco;
      };

      const ehDoFornecedor = async (id: bigint | undefined) => {
        if (id === undefined) return false;
        const endereco = await fornecedorDaProposta(id);
        return endereco !== null && isAddressEqual(endereco, fornecedor);
      };

      let propostasAceitas = 0;
      for (const log of logsAceitas) {
        if (await ehDoFornecedor(log.args.propostaId)) propostasAceitas += 1;
      }

      let propostasRecusadas = 0;
      for (const log of logsRecusadas) {
        if (await ehDoFornecedor(log.args.propostaId)) propostasRecusadas += 1;
      }

      let cprsLiquidadas = 0;
      for (const log of logsLiquidadas) {
        if (await ehDoFornecedor(log.args.tokenId)) cprsLiquidadas += 1;
      }

      // CPREmitida já vem filtrada por fornecedor; confirma histórico on-chain.
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
