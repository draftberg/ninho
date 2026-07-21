"use client";

import { useState } from "react";
import { updateCartao } from "@/lib/actions";
import type { Cartao } from "@/lib/types";

export function EditCartaoForm({ cartao }: { cartao: Cartao }) {
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <button type="button" className="primary-button" onClick={() => setEditing(true)}>
        Editar cartão
      </button>
    );
  }

  return (
    <form
      className="goal-card-new-form"
      action={async (formData) => {
        await updateCartao(formData);
        setEditing(false);
      }}
    >
      <input type="hidden" name="id" value={cartao.id} />
      <label>
        Nome
        <input type="text" name="nome" defaultValue={cartao.nome} required autoFocus />
      </label>
      <label>
        Banco (opcional)
        <input type="text" name="banco" defaultValue={cartao.banco ?? ""} />
      </label>
      <label>
        Limite (opcional)
        <input type="number" name="limite" step="0.01" min="0" defaultValue={cartao.limite ?? ""} />
      </label>
      <label>
        Dia de fechamento
        <input
          type="number"
          name="dia_fechamento"
          min="1"
          max="31"
          defaultValue={cartao.dia_fechamento}
          required
        />
      </label>
      <label>
        Dia de vencimento
        <input
          type="number"
          name="dia_vencimento"
          min="1"
          max="31"
          defaultValue={cartao.dia_vencimento}
          required
        />
      </label>
      <div className="goal-card-new-actions">
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
