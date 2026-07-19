-- Ninho — migração: salário mensal ou quinzenal (duas parcelas)
-- Rode este arquivo no SQL editor do Supabase. É seguro rodar mais de uma vez.

alter table profiles add column if not exists tipo_salario text not null default 'mensal'
  check (tipo_salario in ('mensal', 'quinzenal'));

alter table profiles add column if not exists salario_valor_1 numeric(12, 2);
alter table profiles add column if not exists salario_dia_1 int check (salario_dia_1 between 1 and 31);
alter table profiles add column if not exists salario_valor_2 numeric(12, 2);
alter table profiles add column if not exists salario_dia_2 int check (salario_dia_2 between 1 and 31);

-- migra dados do formato antigo (salario_base + dia_recebimento), se existirem
update profiles
set salario_valor_1 = salario_base, salario_dia_1 = dia_recebimento
where salario_base is not null and salario_valor_1 is null;

alter table profiles drop column if exists salario_base;
alter table profiles drop column if exists dia_recebimento;
