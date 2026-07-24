-- Conexão entre perfis: um convida, o outro aceita; a partir daí as
-- informações se cruzam (visualizadas pelos toggles Berg/Gabi, compartilhado
-- por padrão). Fase 1 é só o mecanismo/estado — a visibilidade ainda não
-- depende dele (todos continuam vendo tudo via RLS is_allowed_email).
--
-- IMPORTANTE: a base já tem dados reais e os dois já compartilham, então
-- Berg↔Gabi já nascem com a conexão 'aceita' (seed no final deste arquivo),
-- pra que quando a Fase 2 ligar a visibilidade por conexão nada suma.

create table if not exists conexoes (
  id uuid primary key default gen_random_uuid(),
  solicitante_email text not null,
  convidado_email text not null,
  status text not null default 'pendente'
    check (status in ('pendente', 'aceita', 'recusada', 'desconectada')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (solicitante_email, convidado_email)
);

alter table conexoes enable row level security;

drop policy if exists "casal pode ver conexoes" on conexoes;
create policy "casal pode ver conexoes" on conexoes
  for select using (is_allowed_email());

drop policy if exists "casal pode criar conexoes" on conexoes;
create policy "casal pode criar conexoes" on conexoes
  for insert with check (is_allowed_email());

drop policy if exists "casal pode atualizar conexoes" on conexoes;
create policy "casal pode atualizar conexoes" on conexoes
  for update using (is_allowed_email()) with check (is_allowed_email());

drop policy if exists "casal pode apagar conexoes" on conexoes;
create policy "casal pode apagar conexoes" on conexoes
  for delete using (is_allowed_email());

-- seed: Berg e Gabi já conectados (ajuste os e-mails se mudarem em
-- src/lib/allowlist.ts). on conflict garante idempotência ao rerodar.
insert into conexoes (solicitante_email, convidado_email, status)
values ('bergg.pinheiro@gmail.com', 'gnogueiradias@gmail.com', 'aceita')
on conflict (solicitante_email, convidado_email) do update set status = 'aceita';
