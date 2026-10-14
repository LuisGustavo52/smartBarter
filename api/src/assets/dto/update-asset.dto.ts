import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

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
}
