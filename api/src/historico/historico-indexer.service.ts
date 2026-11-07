import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createPublicClient,
  http,
  parseAbi,
  isAddress,
  defineChain,
  type Address,
  type PublicClient,
} from 'viem';
import { HistoricoService, NovoRegistroHistorico } from './historico.service';
import {
  dividirIntervalo,
  blocoInicial,
  mapearLog,
  CprDados,
} from './historico-indexer.logic';

const EVENTOS_ABI = parseAbi([
  'event CPREmitida(uint256 indexed tokenId, address indexed produtor, address indexed fornecedor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain)',
  'event EntregaConfirmada(uint256 indexed tokenId)',
  'event CPRLiquidada(uint256 indexed tokenId)',
]);

const CPRS_VIEW_ABI = parseAbi([
  'function cprs(uint256) view returns (address produtor, address fornecedor, uint256 sacas, string insumo, string quantidadeInsumo, string safra, string tipoCafe, string idPropostaOffchain, bool aguardandoEntrega, bool entregue, bool liquidada)',
]);

@Injectable()
export class HistoricoIndexerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HistoricoIndexerService.name);

  private client: PublicClient | null = null;
  private contractAddress: Address | null = null;
  private timer: NodeJS.Timeout | null = null;
  private ativo = false;

  private cursorEmMemoria: bigint | null = null;
  private ultimoEpoch: string | null = null;
  private ultimoAvisoNoFora = 0;

  constructor(
    private readonly configService: ConfigService,
    private readonly historicoService: HistoricoService,
  ) {}

  onModuleInit() {
    const rawAddress = this.configService.get<string>('CONTRACT_ADDRESS');
    if (!rawAddress || !isAddress(rawAddress)) {
      this.logger.error(
        'CONTRACT_ADDRESS ausente ou inválido no ConfigService. Indexador não iniciado.',
      );
      return;
    }

    this.contractAddress = rawAddress as Address;
    const rpcUrl =
      this.configService.get<string>('RPC_URL') ?? 'http://127.0.0.1:8545';

    const hardhatLocal = defineChain({
      id: 31337,
      name: 'Hardhat',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: {
        default: { http: [rpcUrl] },
      },
    });

    this.client = createPublicClient({
      chain: hardhatLocal,
      transport: http(rpcUrl),
    });

    this.ativo = true;
    this.agendarProximoCiclo(0);
  }

  onModuleDestroy() {
    this.ativo = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private agendarProximoCiclo(delayMs: number = 3000) {
    if (!this.ativo) return;

    this.timer = setTimeout(async () => {
      try {
        await this.ciclo();
      } catch (err: any) {
        this.logger.error(
          `Erro inesperado no ciclo do indexador: ${err?.message ?? err}`,
        );
      } finally {
        if (this.ativo) {
          this.agendarProximoCiclo(3000);
        }
      }
    }, delayMs);
  }

  async ciclo(): Promise<void> {
    if (!this.client || !this.contractAddress) {
      return;
    }

    // a) Obter chainEpoch através do bloco 0
    let blocoZero;
    try {
      blocoZero = await this.client.getBlock({ blockNumber: 0n });
    } catch (err: any) {
      const agora = Date.now();
      if (agora - this.ultimoAvisoNoFora >= 60000) {
        this.logger.warn(
          `Nó RPC inacessível (${err?.message ?? err}). Tentando novamente em breve...`,
        );
        this.ultimoAvisoNoFora = agora;
      }
      return;
    }

    const chainEpoch = blocoZero.hash;

    // b) Se o epoch mudou em relação ao ciclo anterior, zerar cursor em memória
    if (this.ultimoEpoch !== chainEpoch) {
      this.logger.log(`Novo epoch da chain detectado: ${chainEpoch}`);
      this.ultimoEpoch = chainEpoch;
      this.cursorEmMemoria = null;
    }

    // c) Determinar bloco de início e head
    let inicio: bigint;
    if (this.cursorEmMemoria !== null) {
      inicio = this.cursorEmMemoria;
    } else {
      const ultimoRegistrado = await this.historicoService.ultimoBlocoDoEpoch(chainEpoch);
      inicio = blocoInicial(ultimoRegistrado, null);
    }

    let head: bigint;
    try {
      head = await this.client.getBlockNumber();
    } catch (err: any) {
      this.logger.error(`Falha ao obter blockNumber atual: ${err?.message ?? err}`);
      return;
    }

    if (inicio > head) {
      return;
    }

    // d) Dividir em intervalos e processar logs
    const intervalos = dividirIntervalo(inicio, head, 2000n);
    const blockTimestampCache = new Map<bigint, bigint>();
    const txFromCache = new Map<string, string>();
    const registrosParaSalvar: NovoRegistroHistorico[] = [];

    for (const [fromBlock, toBlock] of intervalos) {
      let logs;
      try {
        logs = await this.client.getLogs({
          address: this.contractAddress,
          events: EVENTOS_ABI,
          fromBlock,
          toBlock,
        });
      } catch (err: any) {
        this.logger.error(
          `Falha ao buscar logs dos blocos [${fromBlock}, ${toBlock}]: ${err?.message ?? err}`,
        );
        return;
      }

      for (const log of logs) {
        // e) Timestamp do bloco (com cache)
        let ts = blockTimestampCache.get(log.blockNumber);
        if (ts === undefined) {
          try {
            const b = await this.client.getBlock({ blockNumber: log.blockNumber });
            ts = b.timestamp;
            blockTimestampCache.set(log.blockNumber, ts);
          } catch (err: any) {
            this.logger.error(
              `Falha ao buscar timestamp do bloco ${log.blockNumber}: ${err?.message ?? err}`,
            );
            return;
          }
        }

        // e) Ator (from da transação com cache)
        let ator = txFromCache.get(log.transactionHash);
        if (!ator) {
          try {
            const tx = await this.client.getTransaction({ hash: log.transactionHash });
            ator = tx.from;
            txFromCache.set(log.transactionHash, ator);
          } catch (err: any) {
            this.logger.error(
              `Falha ao buscar transação ${log.transactionHash}: ${err?.message ?? err}`,
            );
            return;
          }
        }

        // e) Enriquecimento via readContract cprs() para EntregaConfirmada e CPRLiquidada
        let cpr: CprDados | undefined = undefined;
        const eventName = (log as any).eventName;
        const logArgs = (log as any).args;

        if (eventName === 'EntregaConfirmada' || eventName === 'CPRLiquidada') {
          try {
            const res = await this.client.readContract({
              address: this.contractAddress,
              abi: CPRS_VIEW_ABI,
              functionName: 'cprs',
              args: [logArgs.tokenId],
              blockNumber: log.blockNumber,
            });

            cpr = {
              produtor: res[0],
              fornecedor: res[1],
              sacas: res[2],
              insumo: res[3],
              quantidadeInsumo: res[4],
              safra: res[5],
              tipoCafe: res[6],
              idPropostaOffchain: res[7],
              aguardandoEntrega: res[8],
              entregue: res[9],
              liquidada: res[10],
            };
          } catch (err: any) {
            this.logger.warn(
              `Enriquecimento indisponível para tokenId ${logArgs.tokenId} no bloco ${log.blockNumber}: ${err?.message ?? err}`,
            );
            cpr = undefined;
          }
        }

        const registro = mapearLog({
          eventName,
          args: logArgs,
          txHash: log.transactionHash,
          logIndex: log.logIndex,
          blockNumber: log.blockNumber,
          blockTimestamp: ts,
          chainEpoch,
          ator,
          cpr,
        });

        registrosParaSalvar.push(registro);
      }
    }

    // f) Gravar registros no banco e avançar cursor em caso de sucesso
    if (registrosParaSalvar.length > 0) {
      try {
        await this.historicoService.registrarOnChain(registrosParaSalvar);
      } catch (err: any) {
        this.logger.error(
          `Falha ao persistir registros on-chain do lote [${inicio}, ${head}]: ${err?.message ?? err}. O lote será retentado.`,
        );
        return;
      }
    }

    this.cursorEmMemoria = head + 1n;
  }
}
