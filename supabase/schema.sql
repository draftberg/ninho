-- Ninho — schema do banco (Supabase / Postgres)
-- Rode este arquivo no SQL editor do seu projeto Supabase.

create extension if not exists pgcrypto;

-- ---------- metas (reserva do bebê, viagens, planos...) ----------

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor_meta numeric(12, 2),
  data_inicio date,
  data_alvo date,
  especial_bebe boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------- lançamentos ----------

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  tipo text not null check (tipo in ('entrada', 'saida', 'investimento')),
  categoria text not null check (
    categoria in (
      -- entrada
      'salario', 'freelance', 'rendimentos',
      -- saida
      'moradia', 'contas', 'alimentacao', 'transporte', 'baby', 'educacao',
      'saude', 'lazer', 'pets', 'assinaturas', 'taxas-impostos',
      -- investimento: a meta específica é identificada por goal_id
      'meta',
      -- comum a entrada/saida
      'outros'
    )
  ),
  subcategoria text not null,
  valor numeric(12, 2) not null check (valor > 0),
  descricao text,
  autor text not null,
  goal_id uuid references goals(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists entries_date_idx on entries (date desc);
create index if not exists entries_tipo_idx on entries (tipo);
create index if not exists entries_goal_id_idx on entries (goal_id);

-- ---------- segurança: apenas as 2 contas do casal ----------
-- Ajuste os e-mails abaixo para corresponder aos mesmos definidos em
-- src/lib/allowlist.ts. A allowlist é checada em dois lugares por
-- redundância: no middleware do Next.js e aqui, via RLS.

create or replace function is_allowed_email()
returns boolean
language sql
stable
as $$
  select auth.email() in ('bergg.pinheiro@gmail.com', 'gnogueiradias@gmail.com');
$$;

alter table entries enable row level security;
alter table goals enable row level security;

drop policy if exists "casal pode ver lancamentos" on entries;
create policy "casal pode ver lancamentos" on entries
  for select using (is_allowed_email());

drop policy if exists "casal pode inserir lancamentos" on entries;
create policy "casal pode inserir lancamentos" on entries
  for insert with check (is_allowed_email());

drop policy if exists "casal pode apagar lancamentos" on entries;
create policy "casal pode apagar lancamentos" on entries
  for delete using (is_allowed_email());

drop policy if exists "casal pode ver metas" on goals;
create policy "casal pode ver metas" on goals
  for select using (is_allowed_email());

drop policy if exists "casal pode criar metas" on goals;
create policy "casal pode criar metas" on goals
  for insert with check (is_allowed_email());

drop policy if exists "casal pode atualizar metas" on goals;
create policy "casal pode atualizar metas" on goals
  for update using (is_allowed_email()) with check (is_allowed_email());

drop policy if exists "casal pode apagar metas" on goals;
create policy "casal pode apagar metas" on goals
  for delete using (is_allowed_email());
