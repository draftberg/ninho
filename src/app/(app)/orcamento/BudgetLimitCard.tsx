"use client";

import { useState, useTransition } from "react";
import { upsertBudgetLimits, deleteBudgetLimit } from "@/lib/actions";
import { formatBRL } from "@/lib/format";
import { categoriaLabel } from "@/lib/types";
import type { BudgetLimit } from "@/lib/types";
import { TrashIcon } from "@phosphor-icons/react";

function statusClass(percentual: number): string {
  if (percentual >= 100) return "over";
  if (percentual >= 80) return "warn";
  return "ok";
}

export function BudgetLimitCard({ limit, gasto }: { limit: BudgetLimit; gasto: number }) {
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const percentual = limit.limite_mensal > 0 ? Math.round((gasto / limit.limite_mensal) * 100) : 0;

  function handleDelete() {
    if (!confirm(`Remover a meta de gasto de "${categoriaLabel("saida", limit.categoria)}"?`)) return;
    startTransition(() => {
      deleteBudgetLimit(limit.id);
    });
  }

  if (editing) {
    return (
      <form
        className="budget-card editing"
        action={async (formData) => {
          const limite_mensal = Number(formData.get("limite_mensal"));
          setEditing(false);
          startTransition(() => {
            upsertBudgetLimits([{ autor: limit.autor, categoria: limit.categoria, limite_mensal }]);
          });
        }}
      >
        <span className="budget-card-categoria">{categoriaLabel("saida", limit.categoria)}</span>
        <input
          type="number"
          name="limite_mensal"
          step="0.01"
          min="0"
          defaultValue={limit.limite_mensal}
          className="valor-input"
          autoFocus
        />
        <div className="budget-card-edit-actions">
          <button type="button" className="secondary-button" onClick={() => setEditing(false)}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Salvar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={`budget-card ${statusClass(percentual)}`}>
      <div className="budget-card-header">
        <span className="budget-card-categoria">{categoriaLabel("saida", limit.categoria)}</span>
        <button
          type="button"
          className="delete-button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label="Remover meta de gasto"
        >
          <TrashIcon size={16} />
        </button>
      </div>
      <button type="button" className="budget-card-valores" onClick={() => setEditing(true)}>
        <span className="mono">{formatBRL(gasto)}</span>
        <span className="entry-meta"> de {formatBRL(limit.limite_mensal)}</span>
      </button>
      <div className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${Math.min(percentual, 100)}%` }} />
      </div>
      <span className="budget-card-percentual">{percentual}%</span>
    </div>
  );
}
