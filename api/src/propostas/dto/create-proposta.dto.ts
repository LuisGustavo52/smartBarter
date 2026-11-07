import { IsNumber, IsOptional, IsString, Matches, Min } from 'class-validator';

export class CreatePropostaDto {
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  produtorWallet: string;

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  fornecedorWallet: string;

  @IsString()
  assetId: string;

  @IsNumber()
  @Min(0.000001)
  quantidadeComprada: number;

  @IsOptional()
  @IsString()
  safra?: string;

  @IsOptional()
  @IsString()
  tipoCafe?: string;

  @IsOptional()
  @IsString()
  qualidade?: string;
}
