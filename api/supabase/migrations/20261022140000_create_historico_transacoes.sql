-- Histórico persistente de transações: somente inclusão, sem chaves estrangeiras.
-- Sobrevive a resets do nó Hardhat e a drop/recreate de propostas e assets.
create table if not exists public.historico_transacoes (
  id uuid primary key default gen_random_uuid(),
  ambiente text not null,
  evento text not null
    check (evento in ('PROPOSTA_CRIADA', 'PROPOSTA_ACEITA', 'PROPOSTA_RECUSADA',
                      'CPR_EMITIDA', 'ENTREGA_CONFIRMADA', 'CPR_LIQUIDADA')),
  ocorrido_em timestamptz not null,
  chain_epoch text,
  tx_hash text,
  log_index integer,
  block_number numeric(78, 0),
  token_id numeric(78, 0),
  proposta_id uuid,
  produtor_wallet text,
  fornecedor_wallet text,
  ator_wallet text,
  sacas numeric(78, 0),
  snapshot jsonb not null default '{}'::jsonb,
  registrado_em timestamptz not null default now(),
  constraint historico_onchain_completo check (
    (tx_hash is null and log_index is null and chain_epoch is null)
    or (tx_hash is not null and log_index is not null and chain_epoch is not null)
  ),
  constraint historico_onchain_uniq unique (chain_epoch, tx_hash, log_index)
);

create unique index if not exists historico_offchain_proposta_uidx
  on public.historico_transacoes (proposta_id, evento)
  where tx_hash is null and proposta_id is not null;

create index if not exists historico_produtor_idx on public.historico_transacoes (produtor_wallet, ocorrido_em desc);
create index if not exists historico_fornecedor_idx on public.historico_transacoes (fornecedor_wallet, ocorrido_em desc);
create index if not exists historico_ator_idx on public.historico_transacoes (ator_wallet, ocorrido_em desc);
create index if not exists historico_proposta_idx on public.historico_transacoes (proposta_id);
create index if not exists historico_epoch_bloco_idx on public.historico_transacoes (chain_epoch, block_number desc)
  where chain_epoch is not null;

create or replace function public.historico_transacoes_somente_inclusao()
returns trigger language plpgsql as $$
begin
  raise exception 'historico_transacoes é somente de inclusão (% bloqueado)', tg_op;
end;
$$;

drop trigger if exists historico_bloqueia_alteracao on public.historico_transacoes;
create trigger historico_bloqueia_alteracao
  before update or delete on public.historico_transacoes
  for each row execute function public.historico_transacoes_somente_inclusao();

drop trigger if exists historico_bloqueia_truncate on public.historico_transacoes;
create trigger historico_bloqueia_truncate
  before truncate on public.historico_transacoes
  for each statement execute function public.historico_transacoes_somente_inclusao();
