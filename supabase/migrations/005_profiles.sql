-- Ninho — migração: perfil de cada pessoa (nome, sobrenome, telefone, salário base)
-- Rode este arquivo no SQL editor do Supabase. É seguro rodar mais de uma vez.

create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  nome text,
  sobrenome text,
  telefone text,
  salario_base numeric(12, 2),
  dia_recebimento int check (dia_recebimento between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

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
