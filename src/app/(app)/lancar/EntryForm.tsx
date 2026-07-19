"use client";

import { useState } from "react";
import { addEntry } from "@/lib/actions";
import {
  CATEGORIAS,
  TIPO_LABELS,
  categoriasDoTipo,
  subcategoriasDaCategoria,
  type Goal,
  type Tipo,
} from "@/lib/types";
import { categoriaIcon } from "@/lib/category-icons";
import { todayISO } from "@/lib/format";
import { TrendUpIcon, TrendDownIcon, ChartLineUpIcon } from "@phosphor-icons/react";

const TIPOS: Tipo[] = ["entrada", "saida", "investimento"];
const TIPO_ICONS = { entrada: TrendUpIcon, saida: TrendDownIcon, investimento: ChartLineUpIcon };

export function EntryForm({ goals }: { goals: Goal[] }) {
  const [tipo, setTipo] = useState<Tipo>("entrada");
  const [categoria, setCategoria] = useState<string>(CATEGORIAS.entrada[0].value);
  const [subcategoria, setSubcategoria] = useState<string>(
    CATEGORIAS.entrada[0].subcategorias[0].value,
  );
  const [goalId, setGoalId] = useState<string>(goals[0]?.id ?? "");

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
      {tipo === "investimento" && <input type="hidden" name="goal_id" value={goalId} />}

      <div className="field">
        <label>Tipo</label>
        <div className="tipo-toggle">
          {TIPOS.map((t) => {
            const Icon = TIPO_ICONS[t];
            return (
              <button
                type="button"
                key={t}
                data-tipo={t}
                className={tipo === t ? "active" : ""}
                onClick={() => handleTipoChange(t)}
              >
                <Icon size={16} weight="bold" />
                {TIPO_LABELS[t]}
              </button>
            );
          })}
        </div>
      </div>

      {tipo === "investimento" ? (
        <div className="field">
          <label>Meta</label>
          {goals.length === 0 ? (
            <p className="empty-state">
              Nenhuma meta criada ainda. Crie uma em Reserva antes de lançar um investimento.
            </p>
          ) : (
            <div className="subcategoria-grid">
              {goals.map((g) => (
                <button
                  type="button"
                  key={g.id}
                  className={goalId === g.id ? "active" : ""}
                  onClick={() => setGoalId(g.id)}
                >
                  {g.nome}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="field">
          <label>Categoria</label>
          <div className="subcategoria-grid">
            {categoriasDoTipo(tipo).map((c) => {
              const Icon = categoriaIcon(c.value);
              return (
                <button
                  type="button"
                  key={c.value}
                  className={categoria === c.value ? "active" : ""}
                  onClick={() => handleCategoriaChange(c.value)}
                >
                  <Icon size={15} weight={categoria === c.value ? "fill" : "regular"} />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

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

      <button
        type="submit"
        className="primary-button"
        disabled={tipo === "investimento" && goals.length === 0}
      >
        Lançar
      </button>
    </form>
  );
}
