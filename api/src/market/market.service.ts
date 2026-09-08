import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';

export interface MarketData {
  historico: { data: string; precoUsdSaca: number }[];
  precoAtualUsdSaca: number;
}

interface CacheData {
  timestamp: number;
  data: MarketData;
}

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);
  private cache: CacheData | null = null;
  private readonly CACHE_DURATION_MS = 15 * 60 * 1000; // 15 minutos

  async getCoffeeMarketData(): Promise<MarketData> {
    const now = Date.now();

    // Retorna cache se válido
    if (this.cache && (now - this.cache.timestamp) < this.CACHE_DURATION_MS) {
      this.logger.log('Retornando cotação de mercado do cache');
      return this.cache.data;
    }

    try {
      this.logger.log('Fazendo requisição à API do Yahoo Finance (KC=F)...');
      const response = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/KC=F?interval=1d&range=3mo', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance respondeu com status: ${response.status}`);
      }

      const rawData = await response.json();
      const result = rawData?.chart?.result?.[0];

      if (!result || !result.timestamp || !result.indicators?.quote?.[0]?.close) {
        throw new Error('Formato inesperado na resposta do Yahoo Finance');
      }

      const timestamps: number[] = result.timestamp;
      const closes: (number | null)[] = result.indicators.quote[0].close;

      const historico: { data: string; precoUsdSaca: number }[] = [];
      let precoAtualUsdSaca = 0;

      for (let i = 0; i < timestamps.length; i++) {
        const ts = timestamps[i];
        const closePrice = closes[i];

        if (closePrice !== null && closePrice !== undefined) {
          // closePrice está em centavos de dólar por libra-peso.
          // Converter para dólares por saca (1 saca = 60kg = 132.277 lb)
          const precoUsdSaca = (closePrice / 100) * 132.277;
          
          const dataISO = new Date(ts * 1000).toISOString().split('T')[0];
          historico.push({ data: dataISO, precoUsdSaca });
          precoAtualUsdSaca = precoUsdSaca; // O último válido será o preço atual
        }
      }

      if (historico.length === 0) {
        throw new Error('Nenhum dado de fechamento válido encontrado');
      }

      const marketData: MarketData = {
        historico,
        precoAtualUsdSaca,
      };

      this.cache = {
        timestamp: now,
        data: marketData,
      };

      this.logger.log(`Nova cotação de mercado atualizada. Preço atual: US$ ${precoAtualUsdSaca.toFixed(2)}/saca`);
      return marketData;
    } catch (error: any) {
      this.logger.error(`Falha ao buscar cotação de mercado: ${error.message}`);
      
      // Se tivermos um cache antigo, podemos usar como fallback, mas o requisito diz para retornar erro claro.
      // O prompt diz: "Se a API do Yahoo falhar, retorne um erro claro (não invente dado falso) e deixe o frontend tratar a ausência de dados com uma mensagem, sem quebrar a tela."
      if (this.cache) {
         this.logger.warn('A API falhou, mas temos cache antigo. Retornando cache expirado como fallback.');
         return this.cache.data;
      }
      
      throw new InternalServerErrorException('Falha ao buscar dados de mercado do Yahoo Finance.');
    }
  }
}
