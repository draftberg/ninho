import { createClient } from "@/lib/supabase/server";
import { fetchAllEntries } from "@/lib/data";
import { formatBRL, formatDate } from "@/lib/format";
import { TIPO_LABELS, SUBCATEGORIAS } from "@/lib/types";
import { FiltersBar } from "./FiltersBar";
import { DeleteButton } from "./DeleteButton";

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ autor?: string; tipo?: string }>;
}) {
  const { autor = "todos", tipo = "todos" } = await searchParams;
  const supabase = await createClient();
  const entries = await fetchAllEntries(supabase);

  const autores = Array.from(new Set(entries.map((e) => e.autor))).sort();

  const filtered = entries.filter(
    (e) => (autor === "todos" || e.autor === autor) && (tipo === "todos" || e.tipo === tipo),
  );

  return (
    <div>
      <h2 className="section-title">Histórico</h2>
      <FiltersBar autores={autores} autor={autor} tipo={tipo} />

      {filtered.length === 0 && <p className="empty-state">Nenhum lançamento encontrado.</p>}

      <div className="entry-list">
        {filtered.map((entry) => {
          const subcategoriaLabel =
            SUBCATEGORIAS[entry.tipo].find((s) => s.value === entry.subcategoria)?.label ??
            entry.subcategoria;
          const sign = entry.tipo === "entrada" ? "+" : "-";

          return (
            <div key={entry.id} className="entry-item">
              <div className="entry-main">
                <div>
                  <span className={`tag ${entry.tipo}`}>{TIPO_LABELS[entry.tipo]}</span>
                  <span className="entry-desc">{entry.descricao || subcategoriaLabel}</span>
                </div>
                <span className="entry-meta">
                  {subcategoriaLabel} · {formatDate(entry.date)} · {entry.autor}
                </span>
              </div>
              <span className={`entry-valor ${entry.tipo}`}>
                {sign} {formatBRL(entry.valor)}
              </span>
              <DeleteButton id={entry.id} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
