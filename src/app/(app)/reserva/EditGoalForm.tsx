"use client";

import { useState } from "react";
import { updateGoalTarget } from "@/lib/actions";
import type { Goal } from "@/lib/types";

export function EditGoalForm({ goal }: { goal: Goal }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button type="button" className="primary-button" onClick={() => setEditing(true)}>
        Editar meta
      </button>
    );
  }

  return (
    <form
      className="goal-form"
      action={async (formData) => {
        await updateGoalTarget(formData);
        setEditing(false);
      }}
    >
      <input type="hidden" name="id" value={goal.id} />
      <input
        type="number"
        name="valor_meta"
        step="0.01"
        min="0"
        placeholder="Valor da meta"
        defaultValue={goal.valor_meta ?? ""}
        autoFocus
      />
      <input type="date" name="data_alvo" defaultValue={goal.data_alvo ?? ""} />
      <button type="submit" className="primary-button">
        Salvar
      </button>
    </form>
  );
}
