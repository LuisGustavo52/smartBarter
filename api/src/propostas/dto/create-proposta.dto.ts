import { IsNumber, IsString, Matches, Min } from 'class-validator';

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

  @IsString()
  safra: string;

  @IsString()
  tipoCafe: string;
}
