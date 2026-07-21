create table if not exists financiamentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor_parcela numeric(12, 2) not null check (valor_parcela > 0),
  numero_parcelas int not null check (numero_parcelas > 0),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  categoria text not null default 'moradia',
  subcategoria text not null default 'aluguel',
  created_at timestamptz not null default now()
);

alter table financiamentos enable row level security;

drop policy if exists "casal pode ver financiamentos" on financiamentos;
create policy "casal pode ver financiamentos" on financiamentos
  for select using (is_allowed_email());

drop policy if exists "casal pode criar financiamentos" on financiamentos;
create policy "casal pode criar financiamentos" on financiamentos
  for insert with check (is_allowed_email());

drop policy if exists "casal pode atualizar financiamentos" on financiamentos;
create policy "casal pode atualizar financiamentos" on financiamentos
  for update using (is_allowed_email()) with check (is_allowed_email());

drop policy if exists "casal pode apagar financiamentos" on financiamentos;
create policy "casal pode apagar financiamentos" on financiamentos
  for delete using (is_allowed_email());

-- item de checklist "a_pagar" sincronizado a partir do vencimento do
-- financiamento — um item por financiamento (não por parcela). Apagar o
-- financiamento apaga o item junto.
alter table checklist_items add column if not exists origem_financiamento_id uuid
  references financiamentos(id) on delete cascade;

alter table checklist_items drop constraint if exists checklist_items_origem_financiamento_key;
alter table checklist_items add constraint checklist_items_origem_financiamento_key
  unique (origem_financiamento_id);
