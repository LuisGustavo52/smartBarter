import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateAssetDto } from './dto/create-asset.dto';
import { SupabaseService } from '../supabase/supabase.service';
import { ExchangeService } from './exchange.service';

@Injectable()
export class AssetsService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly exchangeService: ExchangeService,
  ) {}

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

  async getAssets(tipoAtivo?: string) {
    const supabase = this.supabaseService.getClient();

    // 1. Busca os ativos (com ou sem filtro de tipo_ativo)
    let query = supabase.from('assets').select('*').order('created_at', { ascending: false });
    if (tipoAtivo) {
      query = query.eq('tipo_ativo', tipoAtivo);
    }
    
    const { data: assets, error: assetsError } = await query;
    if (assetsError) {
      console.error('ERRO AO BUSCAR ATIVOS GERAL:', assetsError);
      throw new InternalServerErrorException('Erro ao buscar ativos.');
    }

    if (!assets || assets.length === 0) return [];

    // 2. Extrai as carteiras unicas dos donos
    const wallets = Array.from(new Set(assets.map(a => a.dono_wallet.toLowerCase())));

    // 3. Busca os usuários associados a essas carteiras
    // Usamos 'in' para buscar múltiplas carteiras de uma vez. Supabase API is case-sensitive, so we should search with proper case or use ilike.
    // To be safe, we will fetch users and map them by lowercased wallet
    let usersMap = new Map<string, any>();
    if (wallets.length > 0) {
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('carteira_digital, tipo_usuario, nome_propriedade_ou_empresa')
        .in('carteira_digital', assets.map(a => a.dono_wallet)); // Pass the exact wallets from the assets array
      
      if (!usersError && users) {
        users.forEach(u => usersMap.set(u.carteira_digital.toLowerCase(), u));
      } else if (usersError) {
         console.error('ERRO AO BUSCAR USUÁRIOS:', usersError);
         // Não jogamos erro aqui, apenas deixamos os campos de dono vazios se falhar
      }
    }

    // 4. Busca a taxa de câmbio atual
    const usdBrlRate = await this.exchangeService.getUsdBrlRate();

    // 5. Mapeia a resposta final combinando tudo
    return assets.map(asset => {
      const dono = usersMap.get(asset.dono_wallet.toLowerCase());
      const valorOriginal = Number(asset.valor_estimado) || 0;
      
      return {
        id: asset.id,
        tipo_ativo: asset.tipo_ativo,
        descricao: asset.descricao,
        quantidade: asset.quantidade,
        unidade_medida: asset.unidade_medida,
        valor_estimado_brl: valorOriginal,
        valor_estimado_usd: valorOriginal / usdBrlRate,
        dono_wallet: asset.dono_wallet,
        dono_tipo_usuario: dono?.tipo_usuario || 'DESCONHECIDO',
        dono_nome_propriedade_ou_empresa: dono?.nome_propriedade_ou_empresa || 'Não Informado',
        created_at: asset.created_at,
      };
    });
  }
}
