import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { isAddress, getAddress } from 'viem';
import { HistoricoService } from '../historico/historico.service';
import { contarReputacao } from './reputacao.logic';

export interface Reputacao {
  carteira: string;
  propostasAceitas: number;
  propostasRecusadas: number;
  cprsLiquidadas: number;
  scorePercentual: number | null;
  estrelas: number;
  classificacao: string;
}

@Injectable()
export class ReputacaoService {
  private readonly logger = new Logger(ReputacaoService.name);

  constructor(private readonly historicoService: HistoricoService) {}

  async getReputacao(carteira: string): Promise<Reputacao> {
    if (!isAddress(carteira)) {
      throw new BadRequestException('Carteira inválida.');
    }

    const fornecedor = getAddress(carteira);

    try {
      const linhas = await this.historicoService.eventosParaReputacao(fornecedor);
      const { propostasAceitas, propostasRecusadas, cprsLiquidadas } =
        contarReputacao(linhas);

      this.logger.log(
        `Reputação (histórico): aceitas=${propostasAceitas} recusadas=${propostasRecusadas} liquidadas=${cprsLiquidadas}`,
      );

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
      this.logger.error(`Falha ao calcular reputação: ${error?.message ?? error}`);
      throw new InternalServerErrorException('Falha ao calcular reputação.');
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
