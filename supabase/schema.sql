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

-- ---------- cartões de crédito (fatura por fechamento/vencimento) ----------
-- cada compra no crédito cai na fatura certa considerando dia_fechamento e
-- dia_vencimento (ver src/lib/cartoes.ts); o vencimento vira item automático
-- do checklist mensal (ver src/lib/actions.ts: syncCartaoChecklistItem).

create table if not exists cartoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  banco text,
  limite numeric(12, 2) check (limite >= 0),
  dia_fechamento int not null check (dia_fechamento between 1 and 31),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
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
  cartao_id uuid references cartoes(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists entries_date_idx on entries (date desc);
create index if not exists entries_tipo_idx on entries (tipo);
create index if not exists entries_goal_id_idx on entries (goal_id);
create index if not exists entries_cartao_id_idx on entries (cartao_id);

-- ---------- perfil (nome, sobrenome, telefone, salário) ----------
-- salário pode ser mensal (1 parcela) ou quinzenal (2 parcelas em dias diferentes)

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nome text,
  sobrenome text,
  telefone text,
  tipo_salario text not null default 'mensal' check (tipo_salario in ('mensal', 'quinzenal')),
  salario_valor_1 numeric(12, 2),
  salario_dia_1 int check (salario_dia_1 between 1 and 31),
  salario_valor_2 numeric(12, 2),
  salario_dia_2 int check (salario_dia_2 between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- checklist mensal (contas a pagar, salário a receber...) ----------
-- itens "a_receber" com origem_profile_id são sincronizados a partir do
-- salário do Perfil; confirmar um item desses cria o lançamento real de
-- entrada (ver src/lib/actions.ts: confirmarRenda).

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor_esperado numeric(12, 2),
  dia_vencimento int check (dia_vencimento between 1 and 31),
  ativo boolean not null default true,
  tipo text not null default 'a_pagar' check (tipo in ('a_pagar', 'a_receber')),
  origem_profile_id uuid references profiles(id) on delete cascade,
  origem_parcela smallint check (origem_parcela in (1, 2)),
  origem_cartao_id uuid references cartoes(id) on delete cascade,
  categoria text,
  subcategoria text,
  created_at timestamptz not null default now(),
  unique (origem_profile_id, origem_parcela),
  unique (origem_cartao_id)
);

create table if not exists checklist_status (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references checklist_items(id) on delete cascade,
  mes text not null,
  concluido boolean not null default false,
  concluido_em timestamptz,
  entry_id uuid references entries(id) on delete set null,
  unique (item_id, mes)
);

-- ---------- orçamento (metas de gasto por pessoa/categoria) ----------
-- cada pessoa do casal define um limite mensal por categoria de saída; a
-- IA pode sugerir valores com base no salário e no histórico (ver
-- src/lib/insights.ts: suggestBudgetLimits), mas quem confirma e salva é
-- sempre a pessoa.

create table if not exists budget_limits (
  id uuid primary key default gen_random_uuid(),
  autor text not null,
  categoria text not null,
  limite_mensal numeric(12, 2) not null check (limite_mensal >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (autor, categoria)
);

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
alter table checklist_items enable row level security;
alter table checklist_status enable row level security;
alter table profiles enable row level security;
alter table budget_limits enable row level security;
alter table cartoes enable row level security;

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

drop policy if exists "casal pode ver checklist items" on checklist_items;
create policy "casal pode ver checklist items" on checklist_items
  for select using (is_allowed_email());

drop policy if exists "casal pode criar checklist items" on checklist_items;
create policy "casal pode criar checklist items" on checklist_items
  for insert with check (is_allowed_email());

drop policy if exists "casal pode atualizar checklist items" on checklist_items;
create policy "casal pode atualizar checklist items" on checklist_items
  for update using (is_allowed_email()) with check (is_allowed_email());

drop policy if exists "casal pode apagar checklist items" on checklist_items;
create policy "casal pode apagar checklist items" on checklist_items
  for delete using (is_allowed_email());

drop policy if exists "casal pode ver checklist status" on checklist_status;
create policy "casal pode ver checklist status" on checklist_status
  for select using (is_allowed_email());

drop policy if exists "casal pode gravar checklist status" on checklist_status;
create policy "casal pode gravar checklist status" on checklist_status
  for insert with check (is_allowed_email());

drop policy if exists "casal pode atualizar checklist status" on checklist_status;
create policy "casal pode atualizar checklist status" on checklist_status
  for update using (is_allowed_email()) with check (is_allowed_email());

-- qualquer um do casal pode ver os dois perfis (visão combinada do planejamento)
drop policy if exists "casal pode ver perfis" on profiles;
create policy "casal pode ver perfis" on profiles
  for select using (is_allowed_email());

-- cada um só pode criar/editar o próprio perfil
drop policy if exists "cada um cria o proprio perfil" on profiles;
create policy "cada um cria o proprio perfil" on profiles
  for insert with check (is_allowed_email() and email = auth.email());

drop policy if exists "cada um edita o proprio perfil" on profiles;
create policy "cada um edita o proprio perfil" on profiles
  for update using (is_allowed_email() and email = auth.email())
  with check (is_allowed_email() and email = auth.email());

drop policy if exists "cada um apaga o proprio perfil" on profiles;
create policy "cada um apaga o proprio perfil" on profiles
  for delete using (is_allowed_email() and email = auth.email());

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

drop policy if exists "casal pode ver cartoes" on cartoes;
create policy "casal pode ver cartoes" on cartoes
  for select using (is_allowed_email());

drop policy if exists "casal pode criar cartoes" on cartoes;
create policy "casal pode criar cartoes" on cartoes
  for insert with check (is_allowed_email());

drop policy if exists "casal pode atualizar cartoes" on cartoes;
create policy "casal pode atualizar cartoes" on cartoes
  for update using (is_allowed_email()) with check (is_allowed_email());

drop policy if exists "casal pode apagar cartoes" on cartoes;
create policy "casal pode apagar cartoes" on cartoes
  for delete using (is_allowed_email());
