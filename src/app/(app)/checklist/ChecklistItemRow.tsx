"use client";

import { useTransition } from "react";
import { toggleChecklistItem, deleteChecklistItem } from "@/lib/actions";
import { formatBRL } from "@/lib/format";
import type { ChecklistItem } from "@/lib/types";
import { CheckCircleIcon, CircleIcon, TrashIcon } from "@phosphor-icons/react";

export function ChecklistItemRow({
  item,
  mes,
  concluido,
}: {
  item: ChecklistItem;
  mes: string;
  concluido: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(() => {
      toggleChecklistItem(item.id, mes, !concluido);
    });
  }

  function handleDelete() {
    if (!confirm(`Remover "${item.nome}" do checklist?`)) return;
    startTransition(() => {
      deleteChecklistItem(item.id);
    });
  }

  return (
    <div className={`checklist-item${concluido ? " done" : ""}`}>
      <button
        type="button"
        className="checklist-check"
        onClick={handleToggle}
        disabled={isPending}
        aria-label={concluido ? "Marcar como pendente" : "Marcar como concluído"}
      >
        {concluido ? <CheckCircleIcon size={22} weight="fill" /> : <CircleIcon size={22} />}
      </button>
      <div className="checklist-item-main">
        <span className="checklist-item-nome">{item.nome}</span>
        {item.dia_vencimento && <span className="entry-meta">Vence dia {item.dia_vencimento}</span>}
      </div>
      {item.valor_esperado != null && <span className="mono">{formatBRL(item.valor_esperado)}</span>}
      <button
        type="button"
        className="delete-button"
        onClick={handleDelete}
        disabled={isPending}
        aria-label="Remover item"
      >
        <TrashIcon size={16} />
      </button>
    </div>
  );
}
