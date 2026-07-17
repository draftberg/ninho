-- Ninho — schema do banco (Supabase / Postgres)
-- Rode este arquivo no SQL editor do seu projeto Supabase.

create extension if not exists pgcrypto;

-- ---------- lançamentos ----------

create table if not exists entries (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  tipo text not null check (tipo in ('entrada', 'saida', 'investimento')),
  subcategoria text not null check (
    subcategoria in ('salario', 'freela', 'outros', 'fixo', 'variavel', 'nenem', 'futuro', 'reserva')
  ),
  valor numeric(12, 2) not null check (valor > 0),
  descricao text,
  autor text not null,
  created_at timestamptz not null default now()
);

create index if not exists entries_date_idx on entries (date desc);
create index if not exists entries_tipo_idx on entries (tipo);

-- ---------- configurações do casal (meta da reserva do bebê) ----------

create table if not exists settings (
  id int primary key default 1,
  meta_bebe numeric(12, 2) not null default 0,
  constraint settings_singleton check (id = 1)
);

insert into settings (id, meta_bebe)
values (1, 0)
on conflict (id) do nothing;

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
alter table settings enable row level security;

drop policy if exists "casal pode ver lancamentos" on entries;
create policy "casal pode ver lancamentos" on entries
  for select using (is_allowed_email());

drop policy if exists "casal pode inserir lancamentos" on entries;
create policy "casal pode inserir lancamentos" on entries
  for insert with check (is_allowed_email());

drop policy if exists "casal pode apagar lancamentos" on entries;
create policy "casal pode apagar lancamentos" on entries
  for delete using (is_allowed_email());

drop policy if exists "casal pode ver settings" on settings;
create policy "casal pode ver settings" on settings
  for select using (is_allowed_email());

drop policy if exists "casal pode atualizar settings" on settings;
create policy "casal pode atualizar settings" on settings
  for update using (is_allowed_email()) with check (is_allowed_email());
