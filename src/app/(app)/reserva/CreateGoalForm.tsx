"use client";

import { useState } from "react";
import { createGoal } from "@/lib/actions";
import { PlusIcon } from "@phosphor-icons/react";

export function CreateGoalForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="goal-card goal-card-new" onClick={() => setOpen(true)}>
        <PlusIcon size={22} weight="bold" />
        <span>Criar meta</span>
      </button>
    );
  }

  return (
    <form
      className="goal-card goal-card-new-form"
      action={async (formData) => {
        await createGoal(formData);
        setOpen(false);
      }}
    >
      <label>
        Nome
        <input type="text" name="nome" placeholder="Ex: Viagem, Reserva do bebê" required autoFocus />
      </label>
      <label>
        Valor da meta (opcional)
        <input type="number" name="valor_meta" step="0.01" min="0" placeholder="0,00" />
      </label>
      <label>
        Data de conclusão (opcional)
        <input type="date" name="data_alvo" />
      </label>
      <div className="goal-card-new-actions">
        <button type="button" className="secondary-button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button type="submit" className="primary-button">
          Criar
        </button>
      </div>
    </form>
  );
}
