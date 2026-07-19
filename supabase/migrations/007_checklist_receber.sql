-- Ninho — migração: salário planejado vira item de checklist "a receber",
-- e confirmar o item cria o lançamento real de entrada.
-- Rode este arquivo no SQL editor do Supabase. É seguro rodar mais de uma vez.

alter table checklist_items add column if not exists tipo text not null default 'a_pagar'
  check (tipo in ('a_pagar', 'a_receber'));

alter table checklist_items add column if not exists origem_profile_id uuid
  references profiles(id) on delete cascade;

alter table checklist_items add column if not exists origem_parcela smallint
  check (origem_parcela in (1, 2));

alter table checklist_items drop constraint if exists checklist_items_origem_key;
alter table checklist_items add constraint checklist_items_origem_key
  unique (origem_profile_id, origem_parcela);

alter table checklist_status add column if not exists entry_id uuid
  references entries(id) on delete set null;

-- faltava permissão de update em checklist_items (necessária pro upsert
-- que sincroniza os itens "a_receber" a partir do perfil)
drop policy if exists "casal pode atualizar checklist items" on checklist_items;
create policy "casal pode atualizar checklist items" on checklist_items
  for update using (is_allowed_email()) with check (is_allowed_email());
