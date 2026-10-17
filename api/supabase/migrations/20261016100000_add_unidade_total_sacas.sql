-- Migration aditiva: unidade nos insumos e snapshot do cálculo de sacas nas propostas
alter table public.assets
  add column if not exists unidade_medida text not null default 'unidade';
alter table public.propostas
  add column if not exists preco_unitario_sacas numeric(14, 4),
  add column if not exists total_sacas numeric(14, 4),
  add column if not exists sacas_cpr bigint;
