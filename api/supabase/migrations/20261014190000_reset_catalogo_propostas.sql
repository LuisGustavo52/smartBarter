-- Reset seletivo: preserva public.users e recria o catálogo/propostas.
create unique index if not exists users_carteira_digital_unique_idx
  on public.users(carteira_digital);

drop table if exists public.propostas cascade;
drop table if exists public.assets cascade;

create table public.assets (
  id uuid primary key default gen_random_uuid(),
  tipo_ativo text not null default 'INSUMO'
    check (tipo_ativo = 'INSUMO'),
  nome text not null,
  descricao text not null,
  preco_sacas numeric(14, 4) not null check (preco_sacas >= 0),
  fornecedor_wallet text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_fornecedor_wallet_fk
    foreign key (fornecedor_wallet) references public.users(carteira_digital)
);

create table public.propostas (
  id uuid primary key default gen_random_uuid(),
  produtor_wallet text not null,
  fornecedor_wallet text not null,
  asset_id uuid not null references public.assets(id) on delete restrict,
  quantidade_comprada numeric(14, 4) not null check (quantidade_comprada > 0),
  safra text not null,
  tipo_cafe text not null,
  status text not null default 'Pendente'
    check (status in ('Pendente', 'Aceita', 'Recusada')),
  token_id numeric(78, 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint propostas_produtor_wallet_fk
    foreign key (produtor_wallet) references public.users(carteira_digital),
  constraint propostas_fornecedor_wallet_fk
    foreign key (fornecedor_wallet) references public.users(carteira_digital)
);

create index assets_fornecedor_wallet_idx on public.assets(fornecedor_wallet);
create index propostas_fornecedor_status_idx
  on public.propostas(fornecedor_wallet, status);
create index propostas_produtor_status_idx
  on public.propostas(produtor_wallet, status);
create index propostas_asset_idx on public.propostas(asset_id);
