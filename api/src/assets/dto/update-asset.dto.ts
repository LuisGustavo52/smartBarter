import { IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export class UpdateAssetDto {
  @IsString()
  fornecedorWallet: string;

  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsString()
  descricao?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  precoSacas?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  unidadeMedida?: string;
}
