import { Injectable, Logger } from '@nestjs/common';

interface ExchangeData {
  bid: number;
  timestamp: number;
}

@Injectable()
export class ExchangeService {
  private readonly logger = new Logger(ExchangeService.name);
  private cache: ExchangeData | null = null;
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutos
  private readonly FALLBACK_RATE = 5.30;

  async getUsdBrlRate(): Promise<number> {
    const now = Date.now();

    // Retorna cache se válido
    if (this.cache && (now - this.cache.timestamp) < this.CACHE_DURATION_MS) {
      return this.cache.bid;
    }

    try {
      const response = await fetch('https://economia.awesomeapi.com.br/json/last/USD-BRL');
      if (!response.ok) {
        throw new Error(`AwesomeAPI respondeu com status: ${response.status}`);
      }

      const data = await response.json();
      const bidStr = data?.USDBRL?.bid;
      const bid = parseFloat(bidStr);

      if (isNaN(bid)) {
        throw new Error('Valor bid recebido não é um número válido');
      }

      this.cache = {
        bid,
        timestamp: now,
      };

      this.logger.log(`Nova cotação BRL/USD obtida: R$ ${bid}`);
      return bid;
    } catch (error: any) {
      this.logger.error(`Falha ao buscar cotação USD: ${error.message}. Usando fallback de R$ ${this.FALLBACK_RATE}`);
      
      // Tenta usar o valor antigo do cache se existir, caso contrário o fallback fixo
      if (this.cache) {
        this.logger.warn(`Retornando cotação expirada do cache: R$ ${this.cache.bid}`);
        return this.cache.bid;
      }
      return this.FALLBACK_RATE;
    }
  }
}
