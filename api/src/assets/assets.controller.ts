import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  async create(@Body() createAssetDto: CreateAssetDto) {
    return await this.assetsService.createAsset(createAssetDto);
  }

  @Get()
  async getAssets(@Query('tipo_ativo') tipoAtivo?: string) {
    return await this.assetsService.getAssets(tipoAtivo);
  }

  @Get('wallet/:address')
  async getByWallet(@Param('address') address: string) {
    return await this.assetsService.getAssetsByWallet(address);
  }
}
