"use client";

import { useState } from "react";
import { upsertBudgetLimits } from "@/lib/actions";
import { categoriasDoTipo } from "@/lib/types";
import { PlusIcon } from "@phosphor-icons/react";

export function CreateBudgetLimitForm({ people }: { people: string[] }) {
  const [open, setOpen] = useState(false);
  const categorias = categoriasDoTipo("saida");

  if (!open) {
    return (
      <button
        type="button"
        className="goal-card goal-card-new"
        style={{ marginTop: "1rem", maxWidth: 220 }}
        onClick={() => setOpen(true)}
      >
        <PlusIcon size={22} weight="bold" />
        <span>Adicionar meta de gasto</span>
      </button>
    );
  }

  return (
    <form
      className="goal-card-new-form"
      style={{ marginTop: "1rem", maxWidth: 360 }}
      action={async (formData) => {
        const autor = formData.get("autor") as string;
        const categoria = formData.get("categoria") as string;
        const limite_mensal = Number(formData.get("limite_mensal"));
        setOpen(false);
        await upsertBudgetLimits([{ autor, categoria, limite_mensal }]);
      }}
    >
      <label>
        Pessoa
        <select name="autor" required autoFocus>
          {people.map((autor) => (
            <option key={autor} value={autor}>
              {autor}
            </option>
          ))}
        </select>
      </label>
      <label>
        Categoria
        <select name="categoria" required>
          {categorias.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Limite mensal
        <input type="number" name="limite_mensal" step="0.01" min="0.01" placeholder="0,00" required />
      </label>
      <div className="goal-card-new-actions">
        <button type="button" className="secondary-button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button type="submit" className="primary-button">
          Adicionar
        </button>
      </div>
    </form>
  );
}
