-- Migration aditiva: qualidade do café nas propostas (dado off-chain copiado do insumo)
alter table public.propostas
  add column if not exists qualidade text;

notify pgrst, 'reload schema';
