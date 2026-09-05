import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateAssetDto } from './dto/create-asset.dto';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class AssetsService {
  constructor(private readonly supabaseService: SupabaseService) {}

  async createAsset(createAssetDto: CreateAssetDto) {
    const supabase = this.supabaseService.getClient();

    const { data: newAsset, error: insertError } = await supabase
      .from('assets')
      .insert([
        {
          tipo_ativo: createAssetDto.tipoAtivo,
          descricao: createAssetDto.descricao,
          quantidade: createAssetDto.quantidade,
          unidade_medida: createAssetDto.unidadeMedida,
          valor_estimado: createAssetDto.valorEstimado,
          dono_wallet: createAssetDto.donoWallet,
        },
      ])
      .select()
      .single();

    if (insertError) {
      console.error('ERRO DETALHADO DO SUPABASE:', insertError);
      throw new InternalServerErrorException('Erro ao salvar ativo no banco de dados.');
    }

    return {
      id: newAsset.id,
      message: 'Ativo criado com sucesso!',
    };
  }

  async getAssetsByWallet(address: string) {
    const supabase = this.supabaseService.getClient();

    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .ilike('dono_wallet', address)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('ERRO AO BUSCAR ATIVOS:', error);
      throw new InternalServerErrorException('Erro ao buscar ativos no banco de dados.');
    }

    return data || [];
  }
}
