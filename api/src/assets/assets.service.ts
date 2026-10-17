import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';

@Injectable()
export class AssetsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async ensureFornecedor(wallet: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select('carteira_digital')
      .ilike('carteira_digital', wallet)
      .eq('tipo_usuario', 'FORNECEDOR')
      .maybeSingle();

    if (error) throw new InternalServerErrorException('Erro ao validar fornecedor.');
    if (!data) throw new BadRequestException('A carteira não pertence a um fornecedor.');
  }

  async createAsset(dto: CreateAssetDto) {
    await this.ensureFornecedor(dto.fornecedorWallet);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('assets')
      .insert({
        tipo_ativo: 'INSUMO',
        nome: dto.nome,
        descricao: dto.descricao,
        preco_sacas: dto.precoSacas,
        unidade_medida: dto.unidadeMedida ?? 'unidade',
        fornecedor_wallet: dto.fornecedorWallet,
      })
      .select()
      .single();

    if (error) throw new InternalServerErrorException('Erro ao cadastrar o insumo.');
    return data;
  }

  async getAssets(tipoAtivo = 'INSUMO') {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('assets')
      .select('*')
      .eq('tipo_ativo', tipoAtivo)
      .order('created_at', { ascending: false });

    if (error) throw new InternalServerErrorException('Erro ao buscar os insumos.');
    return data ?? [];
  }

  async getAsset(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('assets')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw new InternalServerErrorException('Erro ao buscar o insumo.');
    if (!data) throw new NotFoundException('Insumo não encontrado.');
    return data;
  }

  async getAssetsByWallet(wallet: string) {
    await this.ensureFornecedor(wallet);
    const { data, error } = await this.supabaseService
      .getClient()
      .from('assets')
      .select('*')
      .eq('tipo_ativo', 'INSUMO')
      .ilike('fornecedor_wallet', wallet)
      .order('created_at', { ascending: false });

    if (error) throw new InternalServerErrorException('Erro ao buscar os insumos.');
    return data ?? [];
  }

  async updateAsset(id: string, dto: UpdateAssetDto) {
    await this.ensureFornecedor(dto.fornecedorWallet);
    const asset = await this.getAsset(id);
    if (asset.fornecedor_wallet.toLowerCase() !== dto.fornecedorWallet.toLowerCase()) {
      throw new BadRequestException('O insumo não pertence ao fornecedor informado.');
    }

    const updates = {
      ...(dto.nome !== undefined && { nome: dto.nome }),
      ...(dto.descricao !== undefined && { descricao: dto.descricao }),
      ...(dto.precoSacas !== undefined && { preco_sacas: dto.precoSacas }),
      ...(dto.unidadeMedida !== undefined && { unidade_medida: dto.unidadeMedida }),
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await this.supabaseService
      .getClient()
      .from('assets')
      .update(updates)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw new InternalServerErrorException('Erro ao atualizar o insumo.');
    if (!data) throw new NotFoundException('Insumo não encontrado.');
    return data;
  }

  async removeAsset(id: string, fornecedorWallet: string) {
    await this.ensureFornecedor(fornecedorWallet);
    const asset = await this.getAsset(id);
    if (asset.fornecedor_wallet.toLowerCase() !== fornecedorWallet.toLowerCase()) {
      throw new BadRequestException('O insumo não pertence ao fornecedor informado.');
    }

    const { error } = await this.supabaseService
      .getClient()
      .from('assets')
      .delete()
      .eq('id', id);
    if (error) {
      if (error.code === '23503') {
        throw new ConflictException('O insumo possui propostas vinculadas.');
      }
      throw new InternalServerErrorException('Erro ao remover o insumo.');
    }
    return { success: true };
  }
}
