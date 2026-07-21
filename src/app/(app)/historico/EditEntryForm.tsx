"use client";

import { useState } from "react";
import { updateEntry } from "@/lib/actions";
import {
  categoriasDoTipo,
  subcategoriasDaCategoria,
  type Cartao,
  type Entry,
  type Goal,
  type Tipo,
} from "@/lib/types";
import { categoriaIcon } from "@/lib/category-icons";
import { TrendUpIcon, TrendDownIcon, ChartLineUpIcon, CreditCardIcon } from "@phosphor-icons/react";

const TIPOS: Tipo[] = ["entrada", "saida", "investimento"];
const TIPO_ICONS = { entrada: TrendUpIcon, saida: TrendDownIcon, investimento: ChartLineUpIcon };

export function EditEntryForm({
  entry,
  goals,
  cartoes,
  onCancel,
  onSaved,
}: {
  entry: Entry;
  goals: Goal[];
  cartoes: Cartao[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [tipo, setTipo] = useState<Tipo>(entry.tipo);
  const [categoria, setCategoria] = useState<string>(entry.categoria);
  const [subcategoria, setSubcategoria] = useState<string>(entry.subcategoria);
  const [goalId, setGoalId] = useState<string>(entry.goal_id ?? goals[0]?.id ?? "");
  const [cartaoId, setCartaoId] = useState<string>(entry.cartao_id ?? "");

  function handleTipoChange(next: Tipo) {
    const primeiraCategoria = categoriasDoTipo(next)[0];
    setTipo(next);
    setCategoria(primeiraCategoria.value);
    setSubcategoria(primeiraCategoria.subcategorias[0].value);
    if (next !== "saida") setCartaoId("");
  }

  function handleCategoriaChange(next: string) {
    setCategoria(next);
    setSubcategoria(subcategoriasDaCategoria(tipo, next)[0].value);
  }

  return (
    <form
      className="entry-form entry-edit-form"
      action={async (formData) => {
        await updateEntry(formData);
        onSaved();
      }}
    >
      <input type="hidden" name="id" value={entry.id} />
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="categoria" value={categoria} />
      <input type="hidden" name="subcategoria" value={subcategoria} />
      {tipo === "investimento" && <input type="hidden" name="goal_id" value={goalId} />}
      {tipo === "saida" && <input type="hidden" name="cartao_id" value={cartaoId} />}

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
              </button>
            );
          })}
        </div>
      </div>

      {tipo === "investimento" ? (
        <div className="field">
          <label>Meta</label>
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

      {tipo === "saida" && cartoes.length > 0 && (
        <div className="field">
          <label>Cartão (opcional)</label>
          <div className="subcategoria-grid">
            <button type="button" className={cartaoId === "" ? "active" : ""} onClick={() => setCartaoId("")}>
              Nenhum
            </button>
            {cartoes.map((c) => (
              <button
                type="button"
                key={c.id}
                className={cartaoId === c.id ? "active" : ""}
                onClick={() => setCartaoId(c.id)}
              >
                <CreditCardIcon size={15} weight={cartaoId === c.id ? "fill" : "regular"} />
                {c.nome}
              </button>
            ))}
          </div>
        </div>
      )}

      {tipo === "saida" && (
        <div className="field">
          <label className="checkbox-field">
            <input type="checkbox" name="dividido" value="1" defaultChecked={entry.dividido} />
            Dividir (metade fica como dívida entre vocês)
          </label>
        </div>
      )}

      <div className="field">
        <label htmlFor={`valor-${entry.id}`}>Valor (R$)</label>
        <input
          id={`valor-${entry.id}`}
          name="valor"
          type="number"
          step="0.01"
          min="0.01"
          required
          className="valor-input"
          defaultValue={entry.valor}
        />
      </div>

      <div className="field">
        <label htmlFor={`descricao-${entry.id}`}>Descrição</label>
        <input
          id={`descricao-${entry.id}`}
          name="descricao"
          type="text"
          defaultValue={entry.descricao ?? ""}
        />
      </div>

      <div className="field">
        <label htmlFor={`date-${entry.id}`}>Data</label>
        <input id={`date-${entry.id}`} name="date" type="date" defaultValue={entry.date} required />
      </div>

      <div className="goal-card-new-actions">
        <button type="button" className="secondary-button" onClick={onCancel}>
          Cancelar
        </button>
        <button type="submit" className="primary-button">
          Salvar
        </button>
      </div>
    </form>
  );
}
