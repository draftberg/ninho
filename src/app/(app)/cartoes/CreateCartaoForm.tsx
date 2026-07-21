"use client";

import { useState } from "react";
import { createCartao } from "@/lib/actions";
import { PlusIcon } from "@phosphor-icons/react";

export function CreateCartaoForm() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" className="goal-card goal-card-new" onClick={() => setOpen(true)}>
        <PlusIcon size={22} weight="bold" />
        <span>Criar cartão</span>
      </button>
    );
  }

  return (
    <form
      className="goal-card goal-card-new-form"
      action={async (formData) => {
        await createCartao(formData);
        setOpen(false);
      }}
    >
      <label>
        Nome
        <input type="text" name="nome" placeholder="Ex: Nubank, Inter" required autoFocus />
      </label>
      <label>
        Banco (opcional)
        <input type="text" name="banco" placeholder="Ex: Nubank" />
      </label>
      <label>
        Limite (opcional)
        <input type="number" name="limite" step="0.01" min="0" placeholder="0,00" />
      </label>
      <label>
        Dia de fechamento
        <input type="number" name="dia_fechamento" min="1" max="31" placeholder="Ex: 25" required />
      </label>
      <label>
        Dia de vencimento
        <input type="number" name="dia_vencimento" min="1" max="31" placeholder="Ex: 5" required />
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
