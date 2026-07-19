import { createClient } from "@/lib/supabase/server";
import { fetchAllEntries } from "@/lib/data";
import { formatBRL, formatDate } from "@/lib/format";
import { TIPO_LABELS, categoriaLabel, subcategoriaLabel } from "@/lib/types";
import { personColorClass } from "@/lib/allowlist";
import { FiltersBar } from "./FiltersBar";
import { DeleteButton } from "./DeleteButton";
import { PersonAvatar } from "@/components/PersonAvatar";
import { ViewToggle, type Vista } from "@/components/ViewToggle";

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ autor?: string; tipo?: string; vista?: string }>;
}) {
  const { autor = "todos", tipo = "todos", vista: vistaParam } = await searchParams;
  const vista: Vista = vistaParam === "pessoa" ? "pessoa" : "categoria";
  const supabase = await createClient();
  const entries = await fetchAllEntries(supabase);

  const autores = Array.from(new Set(entries.map((e) => e.autor))).sort();

  const filtered = entries.filter(
    (e) => (autor === "todos" || e.autor === autor) && (tipo === "todos" || e.tipo === tipo),
  );

  return (
    <div>
      <h2 className="section-title">Histórico</h2>
      <ViewToggle vista={vista} />
      <FiltersBar autores={autores} autor={autor} tipo={tipo} />

      {filtered.length === 0 && <p className="empty-state">Nenhum lançamento encontrado.</p>}

      <div className="entry-list">
        {filtered.map((entry) => {
          const catLabel = categoriaLabel(entry.tipo, entry.categoria);
          const subLabel = subcategoriaLabel(entry.tipo, entry.categoria, entry.subcategoria);
          const sign = entry.tipo === "entrada" ? "+" : "-";
          const colorClass = vista === "pessoa" ? personColorClass(entry.autor) : entry.tipo;

          return (
            <div key={entry.id} className="entry-item">
              <div className="entry-row">
                <PersonAvatar autor={entry.autor} />
                <div className="entry-main">
                  <div>
                    <span className={`tag ${colorClass}`}>
                      {vista === "pessoa" ? entry.autor : TIPO_LABELS[entry.tipo]}
                    </span>
                    <span className="entry-desc">{entry.descricao || subLabel}</span>
                  </div>
                  <span className="entry-meta">
                    {catLabel} · {subLabel} · {formatDate(entry.date)} · {entry.autor}
                  </span>
                </div>
              </div>
              <span className={`entry-valor ${colorClass}`}>
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
