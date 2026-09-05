import { IsString, IsNotEmpty, IsEnum, Matches, IsObject } from 'class-validator';

// Enumeração para garantir que apenas os dois tipos de usuários sejam aceitos
export enum TipoUsuario {
  PRODUTOR = 'PRODUTOR',
  FORNECEDOR = 'FORNECEDOR',
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'O nome completo é obrigatório' })
  nomeCompleto: string;

  @IsString()
  @IsNotEmpty({ message: 'O documento (CPF/CNPJ) é obrigatório' })
  documento: string;

  @IsEnum(TipoUsuario, { message: 'O tipo de usuário deve ser PRODUTOR ou FORNECEDOR' })
  @IsNotEmpty()
  tipoUsuario: TipoUsuario;

  @IsString()
  @IsNotEmpty({ message: 'A carteira digital é obrigatória' })
  @Matches(/^0x[a-fA-F0-9]{40}$/, { message: 'A carteira digital deve ser um endereço Ethereum/Polygon válido' })
  carteiraDigital: string;

  @IsString()
  @IsNotEmpty({ message: 'O nome da propriedade ou empresa é obrigatório' })
  nomePropriedadeOuEmpresa: string;

  @IsObject({ message: 'O payload de autenticação é obrigatório' })
  @IsNotEmpty()
  payload: any;

  @IsString()
  @IsNotEmpty({ message: 'A assinatura é obrigatória' })
  signature: string;
}
