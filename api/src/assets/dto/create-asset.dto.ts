import { IsNumber, IsString, Matches, Min } from 'class-validator';

export class CreateAssetDto {
  @IsString()
  nome: string;

  @IsString()
  descricao: string;

  @IsNumber()
  @Min(0)
  precoSacas: number;

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  fornecedorWallet: string;
}
