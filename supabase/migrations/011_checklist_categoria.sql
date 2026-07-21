-- Ninho — migração: categoria/subcategoria em checklist_items.
-- Permite que QUALQUER item do checklist (a_pagar ou a_receber, manual ou
-- sincronizado) gere um lançamento real ao ser confirmado — antes só o
-- salário (a_receber) tinha essa categoria fixa embutida no código.
-- Rode este arquivo no SQL editor do Supabase. É seguro rodar mais de uma vez.

alter table checklist_items add column if not exists categoria text;
alter table checklist_items add column if not exists subcategoria text;
