-- Ninho — migração: taxonomia de 3 níveis (tipo → categoria → subcategoria)
-- Rode este arquivo no SQL editor do Supabase (projeto que já tem o schema.sql original).
-- É seguro rodar mais de uma vez.

-- 1) nova coluna "categoria"
alter table entries add column if not exists categoria text;

-- 2) migra os lançamentos existentes do esquema antigo (tipo + subcategoria)
--    para o novo esquema (tipo + categoria + subcategoria).
--    Obs: para "saida" antiga (fixo/variavel) não dá pra saber a categoria certa
--    automaticamente — caem em uma categoria genérica ("moradia"/"alimentacao")
--    e podem ser recategorizados manualmente na tela de Histórico se necessário.
update entries set
  categoria = case
    when tipo = 'entrada' and subcategoria = 'salario' then 'salario'
    when tipo = 'entrada' and subcategoria = 'freela' then 'freelance'
    when tipo = 'entrada' and subcategoria = 'outros' then 'outros'
    when tipo = 'saida' and subcategoria = 'fixo' then 'moradia'
    when tipo = 'saida' and subcategoria = 'variavel' then 'alimentacao'
    when tipo = 'investimento' and subcategoria = 'nenem' then 'reserva-bebe'
    when tipo = 'investimento' and subcategoria = 'futuro' then 'reserva-emergencia'
    when tipo = 'investimento' and subcategoria = 'reserva' then 'reserva-emergencia'
    else categoria
  end,
  subcategoria = case
    when tipo = 'entrada' and subcategoria = 'salario' then 'salario'
    when tipo = 'entrada' and subcategoria = 'freela' then 'outros'
    when tipo = 'entrada' and subcategoria = 'outros' then 'outros'
    when tipo = 'saida' and subcategoria = 'fixo' then 'manutencao'
    when tipo = 'saida' and subcategoria = 'variavel' then 'mercado'
    when tipo = 'investimento' and subcategoria = 'nenem' then 'aporte'
    when tipo = 'investimento' and subcategoria = 'futuro' then 'aporte'
    when tipo = 'investimento' and subcategoria = 'reserva' then 'aporte'
    else subcategoria
  end
where categoria is null;

-- 3) categoria vira obrigatória
alter table entries alter column categoria set not null;

-- 4) troca as validações antigas pelas novas
alter table entries drop constraint if exists entries_subcategoria_check;

alter table entries drop constraint if exists entries_categoria_check;
alter table entries add constraint entries_categoria_check check (
  categoria in (
    'salario', 'freelance', 'rendimentos',
    'moradia', 'contas', 'alimentacao', 'transporte', 'baby', 'educacao',
    'saude', 'lazer', 'pets', 'assinaturas', 'taxas-impostos',
    'reserva-bebe', 'reserva-emergencia', 'previdencia', 'acoes',
    'outros'
  )
);

create index if not exists entries_categoria_idx on entries (categoria);
