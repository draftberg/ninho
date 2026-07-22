"use client";

import { useState } from "react";
import { updateFinanciamento } from "@/lib/actions";
import { categoriasDoTipo, subcategoriasDaCategoria, type Financiamento } from "@/lib/types";
import { PERSON_DISPLAY_NAMES } from "@/lib/allowlist";

const CATEGORIAS_SAIDA = categoriasDoTipo("saida");

export function EditFinanciamentoForm({ financiamento }: { financiamento: Financiamento }) {
  const [editing, setEditing] = useState(false);
  const [categoria, setCategoria] = useState(financiamento.categoria);
  const [pessoa, setPessoa] = useState(financiamento.pessoa ?? PERSON_DISPLAY_NAMES[0]);
  const subcategorias = subcategoriasDaCategoria("saida", categoria);

  if (!editing) {
    return (
      <button type="button" className="primary-button" onClick={() => setEditing(true)}>
        Editar financiamento
      </button>
    );
  }

  return (
    <form
      className="goal-card-new-form"
      action={async (formData) => {
        await updateFinanciamento(formData);
        setEditing(false);
      }}
    >
      <input type="hidden" name="id" value={financiamento.id} />
      <label>
        Nome
        <input type="text" name="nome" defaultValue={financiamento.nome} required autoFocus />
      </label>
      <label>
        Valor da parcela
        <input
          type="number"
          name="valor_parcela"
          step="0.01"
          min="0.01"
          defaultValue={financiamento.valor_parcela}
          required
        />
      </label>
      <label>
        Número de parcelas
        <input type="number" name="numero_parcelas" min="1" defaultValue={financiamento.numero_parcelas} required />
      </label>
      <label>
        Dia de vencimento
        <input
          type="number"
          name="dia_vencimento"
          min="1"
          max="31"
          defaultValue={financiamento.dia_vencimento}
          required
        />
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
        <select key={categoria} name="subcategoria" defaultValue={financiamento.subcategoria} required>
          {subcategorias.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </label>
      <label>
        Dono
        <select name="pessoa" value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
          {PERSON_DISPLAY_NAMES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
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
