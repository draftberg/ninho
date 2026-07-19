import { createClient } from "@/lib/supabase/server";
import {
  fetchAllEntries,
  fetchChecklistItems,
  fetchChecklistStatus,
  fetchGoals,
  fetchProfiles,
} from "@/lib/data";
import { formatBRL } from "@/lib/format";
import { salarioParcelas } from "@/lib/types";
import { personNameFor } from "@/lib/allowlist";
import { MonthNav } from "@/components/MonthNav";
import { CalendarGrid, type IncomeMarker } from "./CalendarGrid";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : currentMonthKey();
  const [year, month] = mes.split("-").map(Number);

  const supabase = await createClient();
  const [entries, items, status, goals, profiles] = await Promise.all([
    fetchAllEntries(supabase),
    fetchChecklistItems(supabase),
    fetchChecklistStatus(supabase, mes),
    fetchGoals(supabase),
    fetchProfiles(supabase),
  ]);

  const monthEntries = entries.filter((e) => e.date.startsWith(mes));
  const doneItemIds = new Set(status.filter((s) => s.concluido).map((s) => s.item_id));
  const goalsThisMonth = goals.filter((g) => g.data_alvo?.startsWith(mes));

  const incomes: IncomeMarker[] = profiles.flatMap((p) =>
    salarioParcelas(p).map((parcela, i) => ({
      id: `${p.id}-${i}`,
      nome: personNameFor(p.email),
      dia: parcela.dia,
      valor: parcela.valor,
    })),
  );
  const rendaEsperada = incomes.reduce((sum, inc) => sum + inc.valor, 0);

  return (
    <div>
      <h2 className="section-title">Calendário</h2>
      <MonthNav mes={mes} />

      {rendaEsperada > 0 && (
        <p className="entry-meta cashflow-hint">
          Renda mensal esperada: <span className="mono">{formatBRL(rendaEsperada)}</span>
          {incomes.length > 1 &&
            ` (${incomes.map((inc) => `${inc.nome} ${formatBRL(inc.valor)}`).join(", ")})`}
        </p>
      )}

      <CalendarGrid
        year={year}
        month={month}
        entries={monthEntries}
        items={items}
        doneItemIds={doneItemIds}
        goals={goalsThisMonth}
        incomes={incomes}
      />
    </div>
  );
}
