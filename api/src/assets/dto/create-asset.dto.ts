import { IsString, IsNotEmpty, IsEnum, IsNumber, Min } from 'class-validator';

export enum TipoAtivo {
  CAFE = 'CAFE',
  INSUMO = 'INSUMO',
}

export class CreateAssetDto {
  @IsEnum(TipoAtivo, { message: 'O tipo de ativo deve ser CAFE ou INSUMO' })
  @IsNotEmpty()
  tipoAtivo: TipoAtivo;

  @IsString()
  @IsNotEmpty({ message: 'A descrição é obrigatória' })
  descricao: string;

  @IsNumber()
  @Min(0, { message: 'A quantidade deve ser maior ou igual a zero' })
  quantidade: number;

  @IsString()
  @IsNotEmpty({ message: 'A unidade de medida é obrigatória' })
  unidadeMedida: string;

  @IsNumber()
  @Min(0, { message: 'O valor estimado deve ser maior ou igual a zero' })
  valorEstimado: number;

  @IsString()
  @IsNotEmpty({ message: 'A carteira digital do dono é obrigatória' })
  donoWallet: string;
}
