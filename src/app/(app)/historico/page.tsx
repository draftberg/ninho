import { createClient } from "@/lib/supabase/server";
import { fetchAllEntries, fetchGoals, fetchCartoes } from "@/lib/data";
import { monthOptions, filterByMonth, yearOptions, filterByYear } from "@/lib/aggregate";
import { formatDate } from "@/lib/format";
import { FiltersBar } from "./FiltersBar";
import { EntryRow } from "./EntryRow";
import { ViewToggle, type Vista } from "@/components/ViewToggle";
import { LancamentosTabs } from "@/components/LancamentosTabs";
import { MonthFilter } from "@/components/MonthFilter";
import { YearFilter } from "@/components/YearFilter";
import { PeriodToggle, type Periodo } from "@/components/PeriodToggle";
import Link from "next/link";

export default async function HistoricoPage({
  searchParams,
}: {
  searchParams: Promise<{
    autor?: string;
    tipo?: string;
    vista?: string;
    date?: string;
    periodo?: string;
    mes?: string;
    ano?: string;
  }>;
}) {
  const {
    autor = "todos",
    tipo = "todos",
    vista: vistaParam,
    date,
    periodo: periodoParam,
    mes,
    ano,
  } = await searchParams;
  const vista: Vista = vistaParam === "pessoa" ? "pessoa" : "categoria";
  const periodo: Periodo = periodoParam === "ano" ? "ano" : "mes";
  const supabase = await createClient();
  const [entries, goals, cartoes] = await Promise.all([
    fetchAllEntries(supabase),
    fetchGoals(supabase),
    fetchCartoes(supabase),
  ]);

  const autores = Array.from(new Set(entries.map((e) => e.autor))).sort();
  const months = monthOptions(entries);
  const years = yearOptions(entries);
  const selectedMonth = mes && (mes === "todos" || months.includes(mes)) ? mes : "todos";
  const selectedYear = ano && years.includes(ano) ? ano : (years[0] ?? String(new Date().getFullYear()));

  const porPeriodo = date
    ? entries
    : periodo === "ano"
      ? filterByYear(entries, selectedYear)
      : filterByMonth(entries, selectedMonth);

  const filtered = porPeriodo.filter(
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

      {date ? (
        <p className="filtro-data-ativo">
          Filtrando por {formatDate(date)} ·{" "}
          <Link href={`/historico?autor=${autor}&tipo=${tipo}&vista=${vista}`}>Limpar filtro</Link>
        </p>
      ) : (
        <>
          <PeriodToggle periodo={periodo} />
          {periodo === "ano" ? (
            <YearFilter years={years} selected={selectedYear} />
          ) : (
            <MonthFilter months={months} selected={selectedMonth} />
          )}
        </>
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
