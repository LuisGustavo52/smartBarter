import { Controller, Get, Query } from '@nestjs/common';
import { HistoricoService } from './historico.service';
import { ConsultaHistoricoDto } from './dto/consulta-historico.dto';

@Controller('historico')
export class HistoricoController {
  constructor(private readonly historicoService: HistoricoService) {}

  @Get()
  async listar(@Query() dto: ConsultaHistoricoDto) {
    const limit = dto.limit !== undefined ? Number(dto.limit) : 100;
    const offset = dto.offset !== undefined ? Number(dto.offset) : 0;

    return this.historicoService.listar({
      wallet: dto.wallet,
      evento: dto.evento,
      ambiente: dto.ambiente,
      limit,
      offset,
    });
  }
}
