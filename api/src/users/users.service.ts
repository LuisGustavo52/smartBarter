import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async registerUser(createUserDto: CreateUserDto) {
    const supabase = this.supabaseService.getClient();

    // 1. Validação de Regra de Negócio: Não permitir carteiras duplicadas
    const { data: existingUsers, error: searchError } = await supabase
      .from('users')
      .select('id')
      .ilike('carteira_digital', createUserDto.carteiraDigital);

    if (searchError) {
      console.error('ERRO DETALHADO DO SUPABASE:', searchError);
      throw new InternalServerErrorException('Erro ao verificar usuário no banco de dados.');
    }

    if (existingUsers && existingUsers.length > 0) {
      throw new ConflictException('Já existe um usuário cadastrado com esta carteira digital.');
    }

    // 2. Simulação de Criação do Usuário no banco
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          nome_completo: createUserDto.nomeCompleto,
          documento: createUserDto.documento,
          tipo_usuario: createUserDto.tipoUsuario,
          carteira_digital: createUserDto.carteiraDigital,
          nome_propriedade_ou_empresa: createUserDto.nomePropriedadeOuEmpresa,
        },
      ])
      .select()
      .single();

    if (insertError) {
      throw new InternalServerErrorException('Erro ao salvar usuário no banco de dados.');
    }

    // 4. Retorna os dados
    return {
      message: 'Usuário cadastrado com sucesso!',
      user: newUser,
    };
  }

  // Método auxiliar caso queira listar na reunião para mostrar que salvou
  async findAll() {
    const { data, error } = await this.supabaseService.getClient().from('users').select('*');
    if (error) {
      throw new InternalServerErrorException('Erro ao buscar usuários.');
    }
    return data;
  }
}
