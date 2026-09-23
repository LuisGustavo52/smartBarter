import { IsString, IsNotEmpty, Matches, IsObject, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  @Matches(/^[a-z0-9_]{3,20}$/, { message: 'Use apenas letras minúsculas, números e underscore, 3 a 20 caracteres' })
  username?: string;

  @IsString()
  @IsOptional()
  nomePropriedadeOuEmpresa?: string;

  @IsObject({ message: 'O payload de autenticação é obrigatório' })
  @IsNotEmpty()
  payload: any;

  @IsString()
  @IsNotEmpty({ message: 'A assinatura é obrigatória' })
  signature: string;
}
