import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { HistoricoController } from './historico.controller';
import { HistoricoService } from './historico.service';

@Module({
  imports: [SupabaseModule],
  controllers: [HistoricoController],
  providers: [HistoricoService],
  exports: [HistoricoService],
})
export class HistoricoModule {}
