import { Injectable, ConflictException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

// Interface interna simulando a entidade do banco de dados
export interface User extends CreateUserDto {
  id: string;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  // Simulador de banco de dados em memória para o MVP
  private usersDatabase: User[] = [];

  async registerUser(createUserDto: CreateUserDto) {
    // 1. Validação de Regra de Negócio: Não permitir carteiras duplicadas
    const userExists = this.usersDatabase.find(
      (u) => u.carteiraDigital.toLowerCase() === createUserDto.carteiraDigital.toLowerCase(),
    );

    if (userExists) {
      throw new ConflictException('Já existe um usuário cadastrado com esta carteira digital.');
    }

    // 2. Simulação de Criação do Usuário
    const newUser: User = {
      ...createUserDto,
      id: Math.random().toString(36).substring(2, 9), // Gera um ID aleatório
      createdAt: new Date(),
    };

    // 3. Salva no banco de dados (array)
    this.usersDatabase.push(newUser);

    // 4. Retorna os dados simulando a confirmação do banco
    return {
      message: 'Usuário cadastrado com sucesso!',
      user: newUser,
    };
  }

  // Método auxiliar caso queira listar na reunião para mostrar que salvou
  async findAll() {
    return this.usersDatabase;
  }
}
