-- Ninho — migração: cartões de crédito (fatura por fechamento/vencimento).
-- Cada cartão tem dia de fechamento e dia de vencimento; as compras no
-- crédito caem na fatura certa considerando essas datas (ver
-- src/lib/cartoes.ts), e o vencimento vira item automático do checklist
-- mensal (ver src/lib/actions.ts: syncCartaoChecklistItem).
-- Rode este arquivo no SQL editor do Supabase. É seguro rodar mais de uma vez.

create table if not exists cartoes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  banco text,
  limite numeric(12, 2) check (limite >= 0),
  dia_fechamento int not null check (dia_fechamento between 1 and 31),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  created_at timestamptz not null default now()
);

alter table cartoes enable row level security;

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

-- liga cada saída ao cartão usado (opcional — nem toda saída é no cartão;
-- preserva o lançamento histórico se o cartão for apagado, igual entries.goal_id)
alter table entries add column if not exists cartao_id uuid references cartoes(id) on delete set null;
create index if not exists entries_cartao_id_idx on entries (cartao_id);

-- item de checklist "a_pagar" sincronizado a partir do vencimento do cartão —
-- um item por cartão (não por parcela). Apagar o cartão apaga o item junto.
alter table checklist_items add column if not exists origem_cartao_id uuid
  references cartoes(id) on delete cascade;

alter table checklist_items drop constraint if exists checklist_items_origem_cartao_key;
alter table checklist_items add constraint checklist_items_origem_cartao_key
  unique (origem_cartao_id);
