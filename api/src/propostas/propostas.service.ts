import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreatePropostaDto } from './dto/create-proposta.dto';
import { StatusProposta, UpdatePropostaStatusDto } from './dto/update-proposta-status.dto';
import { calcularSacas } from './calculo-sacas';

@Injectable()
export class PropostasService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private async ensureUser(wallet: string, type: 'PRODUTOR' | 'FORNECEDOR') {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('users')
      .select('carteira_digital')
      .ilike('carteira_digital', wallet)
      .eq('tipo_usuario', type)
      .maybeSingle();

    if (error) throw new InternalServerErrorException('Erro ao validar usuário.');
    if (!data) throw new BadRequestException(`A carteira não pertence a um ${type.toLowerCase()}.`);
  }

  async create(dto: CreatePropostaDto) {
    await this.ensureUser(dto.produtorWallet, 'PRODUTOR');
    await this.ensureUser(dto.fornecedorWallet, 'FORNECEDOR');

    const { data: asset, error: assetError } = await this.supabaseService
      .getClient()
      .from('assets')
      .select('id, tipo_ativo, fornecedor_wallet, preco_sacas')
      .eq('id', dto.assetId)
      .eq('tipo_ativo', 'INSUMO')
      .maybeSingle();
    if (assetError) throw new InternalServerErrorException('Erro ao validar o insumo.');
    if (!asset) throw new NotFoundException('Insumo não encontrado.');
    if (asset.fornecedor_wallet.toLowerCase() !== dto.fornecedorWallet.toLowerCase()) {
      throw new BadRequestException('O insumo não pertence ao fornecedor informado.');
    }

    let calculo;
    try {
      calculo = calcularSacas(dto.quantidadeComprada, Number(asset.preco_sacas));
    } catch (err: any) {
      throw new BadRequestException(err?.message ?? 'Erro ao calcular sacas da proposta.');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('propostas')
      .insert({
        produtor_wallet: dto.produtorWallet,
        fornecedor_wallet: dto.fornecedorWallet,
        asset_id: dto.assetId,
        quantidade_comprada: dto.quantidadeComprada,
        preco_unitario_sacas: asset.preco_sacas,
        total_sacas: calculo.totalSacas,
        sacas_cpr: calculo.sacasCpr,
        safra: dto.safra,
        tipo_cafe: dto.tipoCafe,
        status: StatusProposta.PENDENTE,
      })
      .select()
      .single();
    if (error) throw new InternalServerErrorException('Erro ao criar a proposta.');
    return data;
  }

  async findAll(fornecedorWallet?: string, produtorWallet?: string, status?: StatusProposta) {
    let query = this.supabaseService
      .getClient()
      .from('propostas')
      .select('*, assets(id, nome, descricao, preco_sacas, unidade_medida, fornecedor_wallet)')
      .order('created_at', { ascending: false });
    if (fornecedorWallet) query = query.ilike('fornecedor_wallet', fornecedorWallet);
    if (produtorWallet) query = query.ilike('produtor_wallet', produtorWallet);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw new InternalServerErrorException('Erro ao buscar propostas.');
    return data ?? [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabaseService
      .getClient()
      .from('propostas')
      .select('*, assets(id, nome, descricao, preco_sacas, unidade_medida, fornecedor_wallet)')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new InternalServerErrorException('Erro ao buscar proposta.');
    if (!data) throw new NotFoundException('Proposta não encontrada.');
    return data;
  }

  async updateStatus(id: string, dto: UpdatePropostaStatusDto) {
    await this.ensureUser(dto.fornecedorWallet, 'FORNECEDOR');
    const proposta = await this.findOne(id);
    if (proposta.fornecedor_wallet.toLowerCase() !== dto.fornecedorWallet.toLowerCase()) {
      throw new BadRequestException('A proposta não pertence ao fornecedor informado.');
    }
    if (proposta.status !== StatusProposta.PENDENTE) {
      throw new ConflictException('A proposta já foi processada.');
    }
    if (dto.status === StatusProposta.PENDENTE) {
      throw new BadRequestException('Informe Aceita ou Recusada.');
    }
    if (dto.status === StatusProposta.ACEITA && dto.tokenId === undefined) {
      throw new BadRequestException('tokenId é obrigatório ao aceitar a proposta.');
    }

    const { data, error } = await this.supabaseService
      .getClient()
      .from('propostas')
      .update({
        status: dto.status,
        token_id: dto.status === StatusProposta.ACEITA ? dto.tokenId : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('status', StatusProposta.PENDENTE)
      .select()
      .maybeSingle();
    if (error) throw new InternalServerErrorException('Erro ao atualizar proposta.');
    if (!data) throw new ConflictException('A proposta foi alterada por outra operação.');
    return data;
  }
}
