-- Dono (Berg/Gabi) de cartões, financiamentos e itens de checklist manuais.
-- Sem divisão 50/50: cada conta pertence a quem paga; a visão "casal" é a
-- soma de tudo (Berg + Gabi). Colunas opcionais — registros existentes
-- continuam valendo normalmente na visão casal até alguém atribuir um dono.

alter table cartoes add column if not exists pessoa text;
alter table financiamentos add column if not exists pessoa text;
alter table checklist_items add column if not exists pessoa text;
