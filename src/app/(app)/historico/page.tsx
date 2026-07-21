import { createClient } from "@/lib/supabase/server";
import { fetchAllEntries, fetchGoals, fetchCartoes } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { FiltersBar } from "./FiltersBar";
import { EntryRow } from "./EntryRow";
import { ViewToggle, type Vista } from "@/components/ViewToggle";
import { LancamentosTabs } from "@/components/LancamentosTabs";
import Link from "next/link";

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{ autor?: string; tipo?: string; vista?: string; date?: string }>;
}) {
  const { autor = "todos", tipo = "todos", vista: vistaParam, date } = await searchParams;
  const vista: Vista = vistaParam === "pessoa" ? "pessoa" : "categoria";
  const supabase = await createClient();
  const [entries, goals, cartoes] = await Promise.all([
    fetchAllEntries(supabase),
    fetchGoals(supabase),
    fetchCartoes(supabase),
  ]);

  const autores = Array.from(new Set(entries.map((e) => e.autor))).sort();

  const filtered = entries.filter(
    (e) =>
      (autor === "todos" || e.autor === autor) &&
      (tipo === "todos" || e.tipo === tipo) &&
      (!date || e.date === date),
  );

  return (
    <div>
      <h2 className="section-title">Lançamentos</h2>
      <LancamentosTabs ativa="historico" />
      <ViewToggle vista={vista} />
      <FiltersBar autores={autores} autor={autor} tipo={tipo} />

      {date && (
        <p className="filtro-data-ativo">
          Filtrando por {formatDate(date)} ·{" "}
          <Link href={`/historico?autor=${autor}&tipo=${tipo}&vista=${vista}`}>Limpar filtro</Link>
        </p>
      )}

      {filtered.length === 0 && <p className="empty-state">Nenhum lançamento encontrado.</p>}

      <div className="entry-list">
        {filtered.map((entry) => (
          <EntryRow key={entry.id} entry={entry} vista={vista} goals={goals} cartoes={cartoes} />
        ))}
      </div>
    </div>
  );
}
