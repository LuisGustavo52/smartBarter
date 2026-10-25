import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { HistoricoModule } from '../historico/historico.module';
import { PropostasController } from './propostas.controller';
import { PropostasService } from './propostas.service';

@Module({
  imports: [SupabaseModule, HistoricoModule],
  controllers: [PropostasController],
  providers: [PropostasService],
})
export class PropostasModule {}
