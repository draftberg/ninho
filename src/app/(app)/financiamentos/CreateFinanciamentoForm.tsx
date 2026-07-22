"use client";

import { useState } from "react";
import { createFinanciamento } from "@/lib/actions";
import { categoriasDoTipo, subcategoriasDaCategoria } from "@/lib/types";
import { PERSON_DISPLAY_NAMES } from "@/lib/allowlist";
import { PlusIcon } from "@phosphor-icons/react";

const CATEGORIAS_SAIDA = categoriasDoTipo("saida");
const CATEGORIA_PADRAO = CATEGORIAS_SAIDA.find((c) => c.value === "moradia") ?? CATEGORIAS_SAIDA[0];

export function CreateFinanciamentoForm() {
  const [open, setOpen] = useState(false);
  const [categoria, setCategoria] = useState(CATEGORIA_PADRAO.value);
  const [pessoa, setPessoa] = useState<string>(PERSON_DISPLAY_NAMES[0]);
  const subcategorias = subcategoriasDaCategoria("saida", categoria);

  if (!open) {
    return (
      <button type="button" className="goal-card goal-card-new" onClick={() => setOpen(true)}>
        <PlusIcon size={22} weight="bold" />
        <span>Criar financiamento</span>
      </button>
    );
  }

  return (
    <form
      className="goal-card goal-card-new-form"
      action={async (formData) => {
        await createFinanciamento(formData);
        setOpen(false);
        setCategoria(CATEGORIA_PADRAO.value);
        setPessoa(PERSON_DISPLAY_NAMES[0]);
      }}
    >
      <label>
        Nome
        <input type="text" name="nome" placeholder="Ex: Financiamento do carro" required autoFocus />
      </label>
      <label>
        Valor da parcela
        <input type="number" name="valor_parcela" step="0.01" min="0.01" placeholder="0,00" required />
      </label>
      <label>
        Número de parcelas
        <input type="number" name="numero_parcelas" min="1" placeholder="Ex: 48" required />
      </label>
      <label>
        Dia de vencimento
        <input type="number" name="dia_vencimento" min="1" max="31" placeholder="Ex: 10" required />
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
