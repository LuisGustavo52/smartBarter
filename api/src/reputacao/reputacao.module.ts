import { Module } from '@nestjs/common';
import { HistoricoModule } from '../historico/historico.module';
import { ReputacaoController } from './reputacao.controller';
import { ReputacaoService } from './reputacao.service';

@Module({
  imports: [HistoricoModule],
  controllers: [ReputacaoController],
  providers: [ReputacaoService],
})
export class ReputacaoModule {}
