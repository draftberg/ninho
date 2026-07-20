"use client";

import { useState, useTransition } from "react";
import { suggestBudgetLimits, type BudgetSuggestion } from "@/lib/insights";
import { upsertBudgetLimits } from "@/lib/actions";
import { categoriaLabel } from "@/lib/types";
import { SparkleIcon } from "@phosphor-icons/react";

interface Row extends BudgetSuggestion {
  incluir: boolean;
}

export function BudgetSuggestionsPanel() {
  const [isPending, startTransition] = useTransition();
  const [isSaving, startSaving] = useTransition();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleGenerate() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await suggestBudgetLimits();
      if (result.error) {
        setError(result.error);
        setRows(null);
        return;
      }
      setRows((result.suggestions ?? []).map((s) => ({ ...s, incluir: true })));
    });
  }

  function updateRow(index: number, patch: Partial<Row>) {
    setRows((prev) => (prev ? prev.map((r, i) => (i === index ? { ...r, ...patch } : r)) : prev));
  }

  function handleSave() {
    if (!rows) return;
    const selecionadas = rows.filter((r) => r.incluir && r.limite_mensal > 0);
    if (selecionadas.length === 0) return;
    startSaving(async () => {
      await upsertBudgetLimits(
        selecionadas.map((r) => ({ autor: r.autor, categoria: r.categoria, limite_mensal: r.limite_mensal })),
      );
      setRows(null);
      setSaved(true);
    });
  }

  return (
    <div className="insights-card budget-suggestions">
      <div className="insights-header">
        <span className="insights-title">
          <SparkleIcon size={18} weight="fill" /> Sugestão de metas com IA
        </span>
        <button
          type="button"
          className={rows ? "secondary-button" : "primary-button"}
          onClick={handleGenerate}
          disabled={isPending}
        >
          {isPending ? "Analisando..." : rows ? "Gerar de novo" : "Gerar sugestão"}
        </button>
      </div>

      {error && <p className="form-message error">{error}</p>}
      {saved && <p className="form-message success">Metas de gasto salvas!</p>}

      {rows && rows.length > 0 && (
        <>
          <p className="entry-meta">
            Baseado no salário do Perfil e na média de gasto dos últimos 3 meses. Ajuste os valores e desmarque o
            que não quiser salvar.
          </p>
          <div className="budget-suggestions-list">
            {rows.map((row, i) => (
              <div key={`${row.autor}-${row.categoria}`} className="budget-suggestion-row">
                <input
                  type="checkbox"
                  checked={row.incluir}
                  onChange={(e) => updateRow(i, { incluir: e.target.checked })}
                  aria-label="Incluir esta sugestão"
                />
                <div className="budget-suggestion-main">
                  <span className="budget-suggestion-titulo">
                    {row.autor} · {categoriaLabel("saida", row.categoria)}
                  </span>
                  {row.justificativa && <span className="entry-meta">{row.justificativa}</span>}
                </div>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={row.limite_mensal}
                  onChange={(e) => updateRow(i, { limite_mensal: Number(e.target.value) })}
                  className="valor-input"
                />
              </div>
            ))}
          </div>
          <button type="button" className="primary-button" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Salvando..." : "Salvar metas selecionadas"}
          </button>
        </>
      )}
    </div>
  );
}
