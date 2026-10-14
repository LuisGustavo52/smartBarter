import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CreatePropostaDto } from './dto/create-proposta.dto';
import {
  StatusProposta,
  UpdatePropostaStatusDto,
} from './dto/update-proposta-status.dto';
import { PropostasService } from './propostas.service';

@Controller('propostas')
export class PropostasController {
  constructor(private readonly propostasService: PropostasService) {}

  @Post()
  create(@Body() dto: CreatePropostaDto) {
    return this.propostasService.create(dto);
  }

  @Get()
  findAll(
    @Query('fornecedorWallet') fornecedorWallet?: string,
    @Query('produtorWallet') produtorWallet?: string,
    @Query('status') status?: StatusProposta,
  ) {
    return this.propostasService.findAll(fornecedorWallet, produtorWallet, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propostasService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdatePropostaStatusDto) {
    return this.propostasService.updateStatus(id, dto);
  }
}
