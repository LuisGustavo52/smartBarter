-- RLS do histórico: a API usa a chave anon; só leitura e inclusão (sem UPDATE nem DELETE).
alter table public.historico_transacoes enable row level security;

drop policy if exists historico_select_anon on public.historico_transacoes;
create policy historico_select_anon on public.historico_transacoes
  for select to anon using (true);

drop policy if exists historico_insert_anon on public.historico_transacoes;
create policy historico_insert_anon on public.historico_transacoes
  for insert to anon with check (true);
