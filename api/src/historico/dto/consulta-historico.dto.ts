import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import type { EventoHistorico } from '../historico.service';

export const EVENTOS_HISTORICO: EventoHistorico[] = [
  'PROPOSTA_CRIADA',
  'PROPOSTA_ACEITA',
  'PROPOSTA_RECUSADA',
  'CPR_EMITIDA',
  'ENTREGA_CONFIRMADA',
  'CPR_LIQUIDADA',
];

export class ConsultaHistoricoDto {
  @IsOptional()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Carteira inválida. Use o formato hexadecimal 0x...',
  })
  wallet?: string;

  @IsOptional()
  @IsIn(EVENTOS_HISTORICO, {
    message: 'Evento inválido.',
  })
  evento?: EventoHistorico;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  ambiente?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
