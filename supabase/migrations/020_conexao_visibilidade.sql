-- Fase 2 da conexão entre perfis: a visibilidade dos dados passa a depender
-- da conexão. Conectado (status 'aceita') → cada um vê tudo (como hoje).
-- Desconectado/pendente → cada um vê só o que é seu.
--
-- SEGURANÇA: Berg↔Gabi já estão 'aceita' (Fase 1 / seed reafirmado abaixo),
-- então tenho_conexao_aceita() = true pros dois e TODA policy reescrita
-- colapsa exatamente em is_allowed_email() — comportamento idêntico ao atual
-- no deploy, nada some. Desconectar é só um interruptor de visibilidade,
-- reversível, sem apagar nenhuma linha.

-- ---------- funções auxiliares ----------

-- Mapeia e-mail → nome de exibição. MANTENHA EM SINCRONIA com PERSON_NAMES
-- em src/lib/allowlist.ts (mesma sincronia manual que is_allowed_email já
-- exige). Fallback = o próprio e-mail, igual a personNameFor().
create or replace function nome_do_email(e text)
returns text
language sql
immutable
as $$
  select case lower(coalesce(e, ''))
    when 'bergg.pinheiro@gmail.com' then 'Berg'
    when 'gnogueiradias@gmail.com' then 'Gabi'
    else e
  end;
$$;

-- Nome de exibição do usuário logado (nunca null).
create or replace function meu_nome()
returns text
language sql
stable
as $$
  select nome_do_email(auth.email());
$$;

-- O usuário logado tem alguma conexão aceita? security definer pra ler
-- conexoes desacoplado da RLS dela; auth.email() continua sendo o de quem
-- chama (lê o JWT). É stable e sem argumento → avaliada 1x por query.
create or replace function tenho_conexao_aceita()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.conexoes c
    where c.status = 'aceita'
      and auth.email() in (c.solicitante_email, c.convidado_email)
  );
$$;

grant execute on function nome_do_email(text) to authenticated, anon;
grant execute on function meu_nome() to authenticated, anon;
grant execute on function tenho_conexao_aceita() to authenticated, anon;

-- reafirma o seed (defensivo, idempotente) antes de virar as policies
insert into conexoes (solicitante_email, convidado_email, status)
values ('bergg.pinheiro@gmail.com', 'gnogueiradias@gmail.com', 'aceita')
on conflict (solicitante_email, convidado_email) do update set status = 'aceita';

-- ---------- Grupo A: dono é texto not-null (autor) ----------

drop policy if exists "casal pode ver lancamentos" on entries;
create policy "casal pode ver lancamentos" on entries
  for select using (is_allowed_email() and (tenho_conexao_aceita() or autor = meu_nome()));

drop policy if exists "casal pode ver metas de gasto" on budget_limits;
create policy "casal pode ver metas de gasto" on budget_limits
  for select using (is_allowed_email() and (tenho_conexao_aceita() or autor = meu_nome()));

drop policy if exists "casal pode ver conversas" on chat_conversas;
create policy "casal pode ver conversas" on chat_conversas
  for select using (is_allowed_email() and (tenho_conexao_aceita() or autor = meu_nome()));

drop policy if exists "casal pode ver push subscriptions" on push_subscriptions;
create policy "casal pode ver push subscriptions" on push_subscriptions
  for select using (is_allowed_email() and (tenho_conexao_aceita() or autor = meu_nome()));

-- ---------- Grupo A2: profiles (dono é o próprio e-mail) ----------

drop policy if exists "casal pode ver perfis" on profiles;
create policy "casal pode ver perfis" on profiles
  for select using (is_allowed_email() and (tenho_conexao_aceita() or email = auth.email()));

-- ---------- Grupo B: dono é pessoa nullable ----------
-- pessoa is null (legado sem dono) segue visível pro casal — nunca some.

drop policy if exists "casal pode ver cartoes" on cartoes;
create policy "casal pode ver cartoes" on cartoes
  for select using (is_allowed_email() and (tenho_conexao_aceita() or pessoa = meu_nome() or pessoa is null));

drop policy if exists "casal pode ver financiamentos" on financiamentos;
create policy "casal pode ver financiamentos" on financiamentos
  for select using (is_allowed_email() and (tenho_conexao_aceita() or pessoa = meu_nome() or pessoa is null));

drop policy if exists "casal pode ver checklist items" on checklist_items;
create policy "casal pode ver checklist items" on checklist_items
  for select using (is_allowed_email() and (tenho_conexao_aceita() or pessoa = meu_nome() or pessoa is null));

-- ---------- Grupo C: sem dono próprio — herdam visibilidade do pai ----------
-- o exists(...) re-aplica a RLS do pai, então herda a regra sem duplicá-la.

drop policy if exists "casal pode ver checklist status" on checklist_status;
create policy "casal pode ver checklist status" on checklist_status
  for select using (
    is_allowed_email() and (
      tenho_conexao_aceita()
      or exists (select 1 from checklist_items ci where ci.id = checklist_status.item_id)
    )
  );

drop policy if exists "casal pode ver mensagens" on chat_mensagens;
create policy "casal pode ver mensagens" on chat_mensagens
  for select using (
    is_allowed_email() and (
      tenho_conexao_aceita()
      or exists (select 1 from chat_conversas cc where cc.id = chat_mensagens.conversa_id)
    )
  );

-- goals permanece comunal (sem dono próprio) — sem alteração.
-- INSERT/UPDATE/DELETE de todas as tabelas permanecem is_allowed_email().
