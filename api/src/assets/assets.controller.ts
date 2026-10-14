import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post()
  create(@Body() dto: CreateAssetDto) {
    return this.assetsService.createAsset(dto);
  }

  @Get()
  findAll(@Query('tipo_ativo') tipoAtivo?: string) {
    return this.assetsService.getAssets(tipoAtivo);
  }

  @Get('wallet/:address')
  findByWallet(@Param('address') address: string) {
    return this.assetsService.getAssetsByWallet(address);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assetsService.getAsset(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAssetDto) {
    return this.assetsService.updateAsset(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('fornecedorWallet') fornecedorWallet: string) {
    return this.assetsService.removeAsset(id, fornecedorWallet);
  }
}
