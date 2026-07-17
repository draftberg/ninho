"use client";

import { useState } from "react";
import { updateGoal } from "@/lib/actions";

export function GoalForm({ metaBebe }: { metaBebe: number }) {
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
        await updateGoal(formData);
        setEditing(false);
      }}
    >
      <input
        type="number"
        name="meta_bebe"
        step="0.01"
        min="0"
        defaultValue={metaBebe}
        autoFocus
        required
      />
      <button type="submit" className="primary-button">
        Salvar
      </button>
    </form>
  );
}
