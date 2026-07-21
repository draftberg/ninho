"use client";

import { useState } from "react";
import { createChecklistItem } from "@/lib/actions";
import { categoriasDoTipo, subcategoriasDaCategoria } from "@/lib/types";
import { PlusIcon } from "@phosphor-icons/react";

const CATEGORIAS_SAIDA = categoriasDoTipo("saida");

export function CreateChecklistItemForm() {
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState(CATEGORIAS_SAIDA[0].value);
  const subcategorias = subcategoriasDaCategoria("saida", categoria);

  if (!open) {
    return (
      <button
        type="button"
        className="goal-card goal-card-new"
        style={{ marginTop: "1rem", maxWidth: 220 }}
        onClick={() => setOpen(true)}
      >
        <PlusIcon size={22} weight="bold" />
        <span>Adicionar item</span>
      </button>
    );
  }

  return (
    <form
      className="goal-card-new-form"
      style={{ marginTop: "1rem", maxWidth: 360 }}
      action={async (formData) => {
        await createChecklistItem(formData);
        setOpen(false);
        setCategoria(CATEGORIAS_SAIDA[0].value);
      }}
    >
      <label>
        Nome
        <input type="text" name="nome" placeholder="Ex: Aluguel, Internet, Aporte reserva" required autoFocus />
      </label>
      <label>
        Categoria
        <select
          name="categoria"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          required
        >
          {CATEGORIAS_SAIDA.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Subcategoria
        <select key={categoria} name="subcategoria" required>
          {subcategorias.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Valor esperado (opcional)
        <input type="number" name="valor_esperado" step="0.01" min="0" placeholder="0,00" />
      </label>
      <label>
        Dia de vencimento (opcional)
        <input type="number" name="dia_vencimento" min="1" max="31" placeholder="Ex: 10" />
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
