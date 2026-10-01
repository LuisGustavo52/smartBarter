import { Controller, Get, Param } from '@nestjs/common';
import { ReputacaoService } from './reputacao.service';

@Controller('reputacao')
export class ReputacaoController {
  constructor(private readonly reputacaoService: ReputacaoService) {}

  @Get(':carteira')
  async getReputacao(@Param('carteira') carteira: string) {
    return await this.reputacaoService.getReputacao(carteira);
  }
}
