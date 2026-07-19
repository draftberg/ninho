-- Ninho — migração: checklist mensal de contas/reservas
-- Rode este arquivo no SQL editor do Supabase. É seguro rodar mais de uma vez.

create table if not exists checklist_items (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor_esperado numeric(12, 2),
  dia_vencimento int check (dia_vencimento between 1 and 31),
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists checklist_status (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references checklist_items(id) on delete cascade,
  mes text not null,
  concluido boolean not null default false,
  concluido_em timestamptz,
  unique (item_id, mes)
);

alter table checklist_items enable row level security;
alter table checklist_status enable row level security;

drop policy if exists "casal pode ver checklist items" on checklist_items;
create policy "casal pode ver checklist items" on checklist_items
  for select using (is_allowed_email());

drop policy if exists "casal pode criar checklist items" on checklist_items;
create policy "casal pode criar checklist items" on checklist_items
  for insert with check (is_allowed_email());

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
