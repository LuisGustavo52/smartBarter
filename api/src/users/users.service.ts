import { Injectable, ConflictException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { SupabaseService } from '../supabase/supabase.service';
import { verifyLoginPayload } from 'thirdweb/auth';
import { createThirdwebClient } from 'thirdweb';

const client = createThirdwebClient({
  clientId: process.env.THIRDWEB_CLIENT_ID || 'd3690d56bdafa6a3cd84d948259dbbe0',
});

@Injectable()
export class UsersService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async registerUser(createUserDto: CreateUserDto) {
    // 1. Verificação SIWE (Sign-In With Ethereum) via Thirdweb Auth
    try {
      const result = await verifyLoginPayload({
        payload: createUserDto.payload,
        signature: createUserDto.signature,
        client,
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
      .select('id')
      .ilike('carteira_digital', address)
      .maybeSingle();

    if (error) {
      console.error('ERRO AO VERIFICAR CARTEIRA:', error);
      throw new InternalServerErrorException('Erro ao verificar carteira no banco de dados.');
    }

    return { exists: !!data };
  }
}
