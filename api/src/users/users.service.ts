import { Injectable, ConflictException, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { SupabaseService } from '../supabase/supabase.service';
import { createAuth } from 'thirdweb/auth';
import { createThirdwebClient } from 'thirdweb';

const client = createThirdwebClient({
  clientId: process.env.THIRDWEB_CLIENT_ID || 'd3690d56bdafa6a3cd84d948259dbbe0',
});

const auth = createAuth({
  domain: process.env.DOMAIN || 'localhost:3000',
  client,
});

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async registerUser(createUserDto: CreateUserDto) {
    // 1. Verificação SIWE (Sign-In With Ethereum) via Thirdweb Auth
    try {
      const result = await auth.verifyPayload({
        payload: createUserDto.payload,
        signature: createUserDto.signature,
      });

      if (!result.valid) {
        throw new UnauthorizedException('Assinatura inválida ou expirada.');
      }

      if (result.payload.address.toLowerCase() !== createUserDto.carteiraDigital.toLowerCase()) {
        throw new UnauthorizedException('A assinatura não corresponde à carteira digital informada.');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Erro ao verificar payload SIWE:', error);
      throw new UnauthorizedException('Falha na verificação da carteira. Assinatura inválida.');
    }

    const supabase = this.supabaseService.getClient();

    // 2. Validação de Regra de Negócio: Não permitir carteiras duplicadas
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

    // 3. Simulação de Criação do Usuário no banco
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
      id: newUser.id,
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

  async checkWalletExists(address: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .ilike('carteira_digital', address)
      .maybeSingle();

    if (error) {
      console.error('ERRO AO VERIFICAR CARTEIRA:', error);
      throw new InternalServerErrorException('Erro ao verificar carteira no banco de dados.');
    }

    if (!data) {
      return { exists: false };
    }

    return { exists: true, user: data };
  }

  async checkUsernameAvailable(username: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .ilike('username', username)
      .maybeSingle();

    if (error) {
      console.error('ERRO AO VERIFICAR USERNAME:', error);
      throw new InternalServerErrorException('Erro ao verificar disponibilidade de username.');
    }

    return { available: !data };
  }

  async findByUsername(username: string) {
    const supabase = this.supabaseService.getClient();
    const { data, error } = await supabase
      .from('users')
      .select('carteira_digital, nome_completo, tipo_usuario, nome_propriedade_ou_empresa')
      .ilike('username', username)
      .maybeSingle();

    if (error) {
      console.error('ERRO AO BUSCAR USERNAME:', error);
      throw new InternalServerErrorException('Erro ao buscar usuário pelo username.');
    }

    if (!data) {
      throw new NotFoundException('Usuário não encontrado.');
    }

    return data;
  }

  async updateUser(address: string, updateUserDto: UpdateUserDto) {
    // 1. Verificação SIWE (Sign-In With Ethereum) via Thirdweb Auth
    try {
      const result = await auth.verifyPayload({
        payload: updateUserDto.payload,
        signature: updateUserDto.signature,
      });

      if (!result.valid) {
        throw new UnauthorizedException('Assinatura inválida ou expirada.');
      }

      if (result.payload.address.toLowerCase() !== address.toLowerCase()) {
        throw new UnauthorizedException('A assinatura não corresponde à carteira digital informada.');
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      console.error('Erro ao verificar payload SIWE:', error);
      throw new UnauthorizedException('Falha na verificação da carteira. Assinatura inválida.');
    }

    const supabase = this.supabaseService.getClient();

    // 2. Se estiver alterando username, verifica unicidade global
    if (updateUserDto.username) {
      const { data: existingUser, error: searchError } = await supabase
        .from('users')
        .select('id, carteira_digital')
        .ilike('username', updateUserDto.username)
        .neq('carteira_digital', address)
        .maybeSingle();

      if (searchError) {
        console.error('ERRO DETALHADO DO SUPABASE:', searchError);
        throw new InternalServerErrorException('Erro ao verificar disponibilidade do username no banco de dados.');
      }

      if (existingUser) {
        throw new ConflictException('Este @username já está em uso por outro usuário.');
      }
    }

    // 3. Atualiza os dados
    const updateData: any = {};
    if (updateUserDto.username !== undefined) updateData.username = updateUserDto.username;
    if (updateUserDto.nomePropriedadeOuEmpresa !== undefined) updateData.nome_propriedade_ou_empresa = updateUserDto.nomePropriedadeOuEmpresa;

    if (Object.keys(updateData).length === 0) {
      return { success: true, message: 'Nenhum dado para atualizar.' };
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .ilike('carteira_digital', address);

    if (updateError) {
      console.error('ERRO AO ATUALIZAR USUARIO:', updateError);
      throw new InternalServerErrorException('Erro ao atualizar usuário no banco de dados.');
    }

    return { success: true };
  }
}
