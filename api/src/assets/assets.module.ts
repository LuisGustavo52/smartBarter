import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { ExchangeService } from './exchange.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [AssetsController],
  providers: [AssetsService, ExchangeService],
})
export class AssetsModule {}
