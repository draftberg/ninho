-- Ninho — migração: metas múltiplas (generaliza a Reserva do bebê)
-- Rode este arquivo no SQL editor do Supabase (projeto que já tem o schema.sql
-- + 002_categorias.sql). É seguro rodar mais de uma vez.

-- 1) tabela de metas
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor_meta numeric(12, 2),
  data_inicio date,
  data_alvo date,
  especial_bebe boolean not null default false,
  created_at timestamptz not null default now()
);

alter table goals enable row level security;

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

-- 2) liga cada lançamento de investimento a uma meta
alter table entries add column if not exists goal_id uuid references goals(id) on delete set null;
create index if not exists entries_goal_id_idx on entries (goal_id);

-- 3) semeia a meta "Reserva do bebê" a partir do settings.meta_bebe existente
--    (só roda se ainda não existir nenhuma meta marcada como especial_bebe)
insert into goals (nome, valor_meta, especial_bebe)
select 'Reserva do bebê', s.meta_bebe, true
from settings s
where s.id = 1
  and not exists (select 1 from goals where especial_bebe = true);

-- 4) linka os lançamentos antigos de "reserva-bebe" à nova meta
update entries
set goal_id = (select id from goals where especial_bebe = true limit 1)
where tipo = 'investimento' and categoria = 'reserva-bebe' and goal_id is null;

-- 5) daqui pra frente todo lançamento de investimento usa a categoria genérica
--    "meta" — a meta específica é identificada por goal_id, não mais por categoria.
update entries set categoria = 'meta' where tipo = 'investimento';

alter table entries drop constraint if exists entries_categoria_check;
alter table entries add constraint entries_categoria_check check (
  categoria in (
    'salario', 'freelance', 'rendimentos',
    'moradia', 'contas', 'alimentacao', 'transporte', 'baby', 'educacao',
    'saude', 'lazer', 'pets', 'assinaturas', 'taxas-impostos',
    'meta',
    'outros'
  )
);
