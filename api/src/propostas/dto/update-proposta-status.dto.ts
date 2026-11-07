import { IsEnum, IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export enum StatusProposta {
  PENDENTE = 'Pendente',
  ACEITA = 'Aceita',
  RECUSADA = 'Recusada',
}

export class UpdatePropostaStatusDto {
  @IsEnum(StatusProposta)
  status: StatusProposta;

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  fornecedorWallet: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tokenId?: number;
}
