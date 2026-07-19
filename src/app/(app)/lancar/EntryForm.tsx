"use client";

import { useState } from "react";
import { addEntry } from "@/lib/actions";
import {
  CATEGORIAS,
  TIPO_LABELS,
  categoriasDoTipo,
  subcategoriasDaCategoria,
  type Tipo,
} from "@/lib/types";
import { todayISO } from "@/lib/format";

const TIPOS: Tipo[] = ["entrada", "saida", "investimento"];

export function EntryForm() {
  const [tipo, setTipo] = useState<Tipo>("entrada");
  const [categoria, setCategoria] = useState<string>(CATEGORIAS.entrada[0].value);
  const [subcategoria, setSubcategoria] = useState<string>(
    CATEGORIAS.entrada[0].subcategorias[0].value,
  );

  function handleTipoChange(next: Tipo) {
    const primeiraCategoria = CATEGORIAS[next][0];
    setTipo(next);
    setCategoria(primeiraCategoria.value);
    setSubcategoria(primeiraCategoria.subcategorias[0].value);
  }

  function handleCategoriaChange(next: string) {
    setCategoria(next);
    setSubcategoria(subcategoriasDaCategoria(tipo, next)[0].value);
  }

  return (
    <form action={addEntry} className="entry-form">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="categoria" value={categoria} />
      <input type="hidden" name="subcategoria" value={subcategoria} />

      <div className="field">
        <label>Tipo</label>
        <div className="tipo-toggle">
          {TIPOS.map((t) => (
            <button
              type="button"
              key={t}
              data-tipo={t}
              className={tipo === t ? "active" : ""}
              onClick={() => handleTipoChange(t)}
            >
              {TIPO_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Categoria</label>
        <div className="subcategoria-grid">
          {categoriasDoTipo(tipo).map((c) => (
            <button
              type="button"
              key={c.value}
              className={categoria === c.value ? "active" : ""}
              onClick={() => handleCategoriaChange(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Subcategoria</label>
        <div className="subcategoria-grid">
          {subcategoriasDaCategoria(tipo, categoria).map((s) => (
            <button
              type="button"
              key={s.value}
              className={subcategoria === s.value ? "active" : ""}
              onClick={() => setSubcategoria(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label htmlFor="valor">Valor (R$)</label>
        <input
          id="valor"
          name="valor"
          type="number"
          step="0.01"
          min="0.01"
          required
          className="valor-input"
          placeholder="0,00"
        />
      </div>

      <div className="field">
        <label htmlFor="descricao">Descrição</label>
        <input id="descricao" name="descricao" type="text" placeholder="Ex: Aluguel" />
      </div>

      <div className="field">
        <label htmlFor="date">Data</label>
        <input id="date" name="date" type="date" defaultValue={todayISO()} required />
      </div>

      <button type="submit" className="primary-button">
        Lançar
      </button>
    </form>
  );
}
