-- Ninho — migração: metas de gasto por categoria (Orçamento).
-- Cada pessoa do casal define um limite mensal por categoria de saída;
-- a IA pode sugerir valores com base no salário e no histórico, mas quem
-- confirma e salva é sempre a pessoa (ver src/lib/insights.ts: suggestBudgetLimits).
-- Rode este arquivo no SQL editor do Supabase. É seguro rodar mais de uma vez.

create table if not exists budget_limits (
  id uuid primary key default gen_random_uuid(),
  autor text not null,
  categoria text not null,
  limite_mensal numeric(12, 2) not null check (limite_mensal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (autor, categoria)
);

alter table budget_limits enable row level security;

drop policy if exists "casal pode ver metas de gasto" on budget_limits;
create policy "casal pode ver metas de gasto" on budget_limits
  for select using (is_allowed_email());

drop policy if exists "casal pode criar metas de gasto" on budget_limits;
create policy "casal pode criar metas de gasto" on budget_limits
  for insert with check (is_allowed_email());

drop policy if exists "casal pode atualizar metas de gasto" on budget_limits;
create policy "casal pode atualizar metas de gasto" on budget_limits
  for update using (is_allowed_email()) with check (is_allowed_email());

drop policy if exists "casal pode apagar metas de gasto" on budget_limits;
create policy "casal pode apagar metas de gasto" on budget_limits
  for delete using (is_allowed_email());
