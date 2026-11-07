import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_KEY;
if (!url || !key) throw new Error('SUPABASE_URL e SUPABASE_KEY são obrigatórios.');

const supabase = createClient(url, key);

async function ensureNewSchema() {
  const { error: assetsError } = await supabase
    .from('assets')
    .select('id, nome, preco_sacas, fornecedor_wallet')
    .limit(1);

  if (assetsError) {
    throw new Error(
      [
        'O Supabase ainda não está usando o schema novo de assets.',
        `Detalhe: ${assetsError.message}`,
        'Aplique primeiro api/supabase/migrations/20261014190000_reset_catalogo_propostas.sql',
        'no projeto Supabase. Essa migração preserva users e recria assets/propostas.',
      ].join('\n'),
    );
  }

  const { error: propostasError } = await supabase
    .from('propostas')
    .select('id, asset_id, produtor_wallet, fornecedor_wallet, token_id')
    .limit(1);

  if (propostasError) {
    throw new Error(
      [
        'A tabela propostas não está no schema novo.',
        `Detalhe: ${propostasError.message}`,
        'Aplique primeiro api/supabase/migrations/20261014190000_reset_catalogo_propostas.sql',
      ].join('\n'),
    );
  }
}

async function findUser(type: 'PRODUTOR' | 'FORNECEDOR', configuredWallet?: string) {
  let query = supabase
    .from('users')
    .select('carteira_digital')
    .eq('tipo_usuario', type)
    .limit(1);
  if (configuredWallet) query = query.ilike('carteira_digital', configuredWallet);

  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Falha ao buscar ${type}: ${error.message}`);
  if (!data) throw new Error(`Nenhum usuário ${type} encontrado para o seed.`);
  return data.carteira_digital;
}

async function main() {
  await ensureNewSchema();

  const fornecedorWallet = await findUser(
    'FORNECEDOR',
    process.env.SEED_FORNECEDOR_WALLET,
  );
  const produtorWallet = await findUser(
    'PRODUTOR',
    process.env.SEED_PRODUTOR_WALLET,
  );

  const { data: existingAsset, error: assetLookupError } = await supabase
    .from('assets')
    .select('id')
    .eq('fornecedor_wallet', fornecedorWallet)
    .eq('nome', 'Insumo de teste')
    .maybeSingle();
  if (assetLookupError) throw new Error(assetLookupError.message);

  let assetId = existingAsset?.id;
  if (!assetId) {
    const { data: asset, error } = await supabase
      .from('assets')
      .insert({
        tipo_ativo: 'INSUMO',
        nome: 'Insumo de teste',
        descricao: 'Registro criado pelo seed da Fase 2.',
        preco_sacas: 12.5,
        fornecedor_wallet: fornecedorWallet,
      })
      .select('id')
      .single();
    if (error || !asset) throw new Error(`Falha ao criar insumo: ${error?.message}`);
    assetId = asset.id;
  }

  const { data: existingProposal, error: proposalLookupError } = await supabase
    .from('propostas')
    .select('id')
    .eq('asset_id', assetId)
    .eq('produtor_wallet', produtorWallet)
    .eq('status', 'Pendente')
    .maybeSingle();
  if (proposalLookupError) throw new Error(proposalLookupError.message);

  if (!existingProposal) {
    const { error } = await supabase.from('propostas').insert({
      produtor_wallet: produtorWallet,
      fornecedor_wallet: fornecedorWallet,
      asset_id: assetId,
      quantidade_comprada: 10,
      safra: '2026/2027',
      tipo_cafe: 'Arábica Borges',
      status: 'Pendente',
    });
    if (error) throw new Error(`Falha ao criar proposta: ${error.message}`);
  }

  console.log(JSON.stringify({ fornecedorWallet, produtorWallet, assetId }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
