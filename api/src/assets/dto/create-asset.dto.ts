import { IsIn, IsNumber, IsOptional, IsString, Matches, MaxLength, Min } from 'class-validator';

export const UNIDADES_VENDA_PERMITIDAS = [
  'unidade',
  'unidades',
  'saco 50 kg',
  'saco 25 kg',
  'Sacos (50 kg)',
  'sacos',
  'sacas',
  'litro',
  'tonelada',
  'toneladas',
  'ton',
  'galão',
  'kg',
] as const;

export const TIPOS_CAFE_PERMITIDOS = ['Arábica', 'Conilon / Robusta'] as const;

export const SAFRAS_PERMITIDAS = [
  '2024/2025',
  '2025/2026',
  '2026/2027',
  '2027/2028',
] as const;

export const QUALIDADES_CAFE_PERMITIDAS = [
  'Fresco',
  'Estritamente Mole',
  'Bebida Mole',
  'Apenas Mole',
  'Bebida Dura',
  'Riada',
  'Rio',
] as const;

export class CreateAssetDto {
  @IsString()
  nome: string;

  @IsString()
  descricao: string;

  @IsNumber()
  @Min(0)
  precoSacas: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  @IsIn(UNIDADES_VENDA_PERMITIDAS)
  unidadeMedida?: string;

  @IsOptional()
  @IsString()
  @IsIn(TIPOS_CAFE_PERMITIDOS)
  tipoCafe?: string;

  @IsOptional()
  @IsString()
  @IsIn(SAFRAS_PERMITIDAS)
  safra?: string;

  @IsOptional()
  @IsString()
  @IsIn(QUALIDADES_CAFE_PERMITIDAS)
  qualidade?: string;

  @IsString()
  @Matches(/^0x[a-fA-F0-9]{40}$/)
  fornecedorWallet: string;
}
