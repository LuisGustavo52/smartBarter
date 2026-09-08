import { Controller, Get } from '@nestjs/common';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('cafe')
  async getCafeMarket() {
    return await this.marketService.getCoffeeMarketData();
  }
}
