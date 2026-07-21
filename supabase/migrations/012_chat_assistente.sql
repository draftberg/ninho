-- Ninho — migração: assistente financeiro em chat (bolhão flutuante).
-- Conversas são agrupadas por dia e têm um tema (título curto gerado pela
-- IA na primeira troca de mensagens). Rode este arquivo no SQL editor do
-- Supabase. É seguro rodar mais de uma vez.

create table if not exists chat_conversas (
  id uuid primary key default gen_random_uuid(),
  autor text not null,
  tema text not null default 'Nova conversa',
  dia date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists chat_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references chat_conversas(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists chat_conversas_dia_idx on chat_conversas (dia desc);
create index if not exists chat_mensagens_conversa_id_idx on chat_mensagens (conversa_id);

alter table chat_conversas enable row level security;
alter table chat_mensagens enable row level security;

drop policy if exists "casal pode ver conversas" on chat_conversas;
create policy "casal pode ver conversas" on chat_conversas
  for select using (is_allowed_email());

drop policy if exists "casal pode criar conversas" on chat_conversas;
create policy "casal pode criar conversas" on chat_conversas
  for insert with check (is_allowed_email());

drop policy if exists "casal pode atualizar conversas" on chat_conversas;
create policy "casal pode atualizar conversas" on chat_conversas
  for update using (is_allowed_email()) with check (is_allowed_email());

drop policy if exists "casal pode apagar conversas" on chat_conversas;
create policy "casal pode apagar conversas" on chat_conversas
  for delete using (is_allowed_email());

drop policy if exists "casal pode ver mensagens" on chat_mensagens;
create policy "casal pode ver mensagens" on chat_mensagens
  for select using (is_allowed_email());

drop policy if exists "casal pode criar mensagens" on chat_mensagens;
create policy "casal pode criar mensagens" on chat_mensagens
  for insert with check (is_allowed_email());

drop policy if exists "casal pode apagar mensagens" on chat_mensagens;
create policy "casal pode apagar mensagens" on chat_mensagens
  for delete using (is_allowed_email());
