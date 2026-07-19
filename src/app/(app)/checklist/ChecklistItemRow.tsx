"use client";

import { useState, useTransition } from "react";
import { toggleChecklistItem, deleteChecklistItem, confirmarRenda, desconfirmarRenda } from "@/lib/actions";
import { formatBRL } from "@/lib/format";
import type { ChecklistItem } from "@/lib/types";
import { CheckCircleIcon, CircleIcon, TrashIcon } from "@phosphor-icons/react";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

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
  const [confirming, setConfirming] = useState(false);
  const isReceber = item.tipo === "a_receber";

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

  function handleCheckClick() {
    if (isReceber) {
      if (concluido) {
        if (!confirm("Desfazer a confirmação? O lançamento criado será excluído.")) return;
        startTransition(() => {
          desconfirmarRenda(item.id, mes);
        });
      } else {
        setConfirming(true);
      }
      return;
    }
    handleToggle();
  }

  if (confirming) {
    const defaultDate = item.dia_vencimento ? `${mes}-${pad(item.dia_vencimento)}` : `${mes}-01`;
    return (
      <form
        className="checklist-item confirm-renda"
        action={async (formData) => {
          const valor = Number(formData.get("valor"));
          const date = formData.get("date") as string;
          setConfirming(false);
          startTransition(() => {
            confirmarRenda(item.id, mes, valor, date);
          });
        }}
      >
        <div className="checklist-item-main">
          <span className="checklist-item-nome">{item.nome}</span>
          <div className="confirm-renda-fields">
            <input
              type="number"
              name="valor"
              step="0.01"
              min="0.01"
              defaultValue={item.valor_esperado ?? ""}
              required
              className="valor-input"
            />
            <input type="date" name="date" defaultValue={defaultDate} required />
          </div>
        </div>
        <div className="confirm-renda-actions">
          <button type="button" className="secondary-button" onClick={() => setConfirming(false)}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Confirmar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={`checklist-item${concluido ? " done" : ""}${isReceber ? " a-receber" : ""}`}>
      <button
        type="button"
        className="checklist-check"
        onClick={handleCheckClick}
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
      {!item.origem_profile_id && (
        <button
          type="button"
          className="delete-button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label="Remover item"
        >
          <TrashIcon size={16} />
        </button>
      )}
    </div>
  );
}
