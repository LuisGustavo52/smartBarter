import { Module } from '@nestjs/common';
import { ReputacaoController } from './reputacao.controller';
import { ReputacaoService } from './reputacao.service';

@Module({
  controllers: [ReputacaoController],
  providers: [ReputacaoService],
})
export class ReputacaoModule {}
