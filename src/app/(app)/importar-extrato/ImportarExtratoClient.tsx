"use client";

import { useRef, useState } from "react";
import { extractTransactions } from "@/lib/import-extrato";
import { saveImportedEntries } from "@/lib/actions";
import { SUBCATEGORIAS, TIPO_LABELS, type NewEntry, type Subcategoria, type Tipo } from "@/lib/types";

const TIPOS: Tipo[] = ["entrada", "saida", "investimento"];

export function ImportarExtratoClient() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<NewEntry[] | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    setSaved(false);

    const formData = new FormData();
    formData.set("file", file);

    const result = await extractTransactions(formData);
    setLoading(false);

    if (result.error) {
      setError(result.error);
      setTransactions(null);
      return;
    }

    setTransactions(result.transactions ?? []);
  }

  function updateTransaction(index: number, patch: Partial<NewEntry>) {
    setTransactions((prev) => {
      if (!prev) return prev;
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  function removeTransaction(index: number) {
    setTransactions((prev) => (prev ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleSave() {
    if (!transactions || transactions.length === 0) return;
    setLoading(true);
    await saveImportedEntries(transactions);
    setLoading(false);
    setSaved(true);
    setTransactions(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div>
      <div className="dropzone" onClick={() => fileInputRef.current?.click()}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.csv,.txt,text/csv,text/plain,application/pdf"
          hidden
          onChange={handleFileChange}
        />
        {loading ? "Processando arquivo com IA..." : "Toque para enviar um extrato (PDF, CSV ou TXT)"}
      </div>

      {error && <p className="form-message error" style={{ marginTop: "1rem" }}>{error}</p>}
      {saved && (
        <p className="form-message success" style={{ marginTop: "1rem" }}>
          Lançamentos importados com sucesso!
        </p>
      )}

      {transactions && transactions.length > 0 && (
        <div style={{ marginTop: "1.5rem", overflowX: "auto" }}>
          <p>Revise antes de salvar:</p>
          <table className="review-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Subcategoria</th>
                <th>Valor</th>
                <th>Descrição</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, i) => (
                <tr key={i}>
                  <td>
                    <input
                      type="date"
                      value={t.date}
                      onChange={(e) => updateTransaction(i, { date: e.target.value })}
                    />
                  </td>
                  <td>
                    <select
                      value={t.tipo}
                      onChange={(e) => {
                        const tipo = e.target.value as Tipo;
                        updateTransaction(i, { tipo, subcategoria: SUBCATEGORIAS[tipo][0].value });
                      }}
                    >
                      {TIPOS.map((tipo) => (
                        <option key={tipo} value={tipo}>
                          {TIPO_LABELS[tipo]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={t.subcategoria}
                      onChange={(e) =>
                        updateTransaction(i, { subcategoria: e.target.value as Subcategoria })
                      }
                    >
                      {SUBCATEGORIAS[t.tipo].map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="0.01"
                      value={t.valor}
                      onChange={(e) => updateTransaction(i, { valor: Number(e.target.value) })}
                    />
                  </td>
                  <td>
                    <input
                      type="text"
                      value={t.descricao ?? ""}
                      onChange={(e) => updateTransaction(i, { descricao: e.target.value })}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => removeTransaction(i)}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            type="button"
            className="primary-button"
            style={{ marginTop: "1rem" }}
            onClick={handleSave}
            disabled={loading}
          >
            Salvar {transactions.length} lançamento(s)
          </button>
        </div>
      )}
    </div>
  );
}
