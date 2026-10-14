import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { SupabaseModule } from './supabase/supabase.module';
import { AssetsModule } from './assets/assets.module';
import { MarketModule } from './market/market.module';
import { ReputacaoModule } from './reputacao/reputacao.module';
import { PropostasModule } from './propostas/propostas.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    UsersModule,
    AssetsModule,
    MarketModule,
    ReputacaoModule,
    PropostasModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
