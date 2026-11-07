import { IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';
import {
  QUALIDADES_CAFE_PERMITIDAS,
  SAFRAS_PERMITIDAS,
  TIPOS_CAFE_PERMITIDOS,
  UNIDADES_VENDA_PERMITIDAS,
} from './create-asset.dto';

export class UpdateAssetDto {
  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
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
  @IsIn(UNIDADES_VENDA_PERMITIDAS)
  unidadeMedida?: string;

  @IsOptional()
  @IsString()
  @IsIn(['', ...TIPOS_CAFE_PERMITIDOS])
  tipoCafe?: string;

  @IsOptional()
  @IsString()
  @IsIn(['', ...SAFRAS_PERMITIDAS])
  safra?: string;

  @IsOptional()
  @IsString()
  @IsIn(['', ...QUALIDADES_CAFE_PERMITIDAS])
  qualidade?: string;
}
