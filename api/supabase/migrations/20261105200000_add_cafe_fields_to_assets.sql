-- Migration aditiva: especificações do café (safra, tipo_cafe, qualidade) nos insumos (assets)
alter table public.assets
  add column if not exists safra varchar,
  add column if not exists tipo_cafe varchar,
  add column if not exists qualidade varchar;

notify pgrst, 'reload schema';
