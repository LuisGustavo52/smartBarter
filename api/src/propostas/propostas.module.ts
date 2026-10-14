import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PropostasController } from './propostas.controller';
import { PropostasService } from './propostas.service';

@Module({
  imports: [SupabaseModule],
  controllers: [PropostasController],
  providers: [PropostasService],
})
export class PropostasModule {}
