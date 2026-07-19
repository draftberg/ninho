import { createClient } from "@/lib/supabase/server";
import { fetchAllEntries, fetchChecklistItems, fetchChecklistStatus, fetchGoals } from "@/lib/data";
import { formatBRL } from "@/lib/format";
import { MonthNav } from "@/components/MonthNav";
import { CalendarGrid } from "./CalendarGrid";

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
  const [entries, items, status, goals] = await Promise.all([
    fetchAllEntries(supabase),
    fetchChecklistItems(supabase),
    fetchChecklistStatus(supabase, mes),
    fetchGoals(supabase),
  ]);

  const monthEntries = entries.filter((e) => e.date.startsWith(mes));
  const doneItemIds = new Set(status.filter((s) => s.concluido).map((s) => s.item_id));
  const goalsThisMonth = goals.filter((g) => g.data_alvo?.startsWith(mes));

  const incomeItems = items.filter((i) => i.tipo === "a_receber");
  const rendaEsperada = incomeItems.reduce((sum, i) => sum + Number(i.valor_esperado ?? 0), 0);

  return (
    <div>
      <h2 className="section-title">Calendário</h2>
      <MonthNav mes={mes} />

      {rendaEsperada > 0 && (
        <p className="entry-meta cashflow-hint">
          Renda mensal esperada: <span className="mono">{formatBRL(rendaEsperada)}</span>
          {incomeItems.length > 1 &&
            ` (${incomeItems.map((i) => `${i.nome} ${formatBRL(Number(i.valor_esperado ?? 0))}`).join(", ")})`}
        </p>
      )}

      <CalendarGrid
        year={year}
        month={month}
        entries={monthEntries}
        items={items}
        doneItemIds={doneItemIds}
        goals={goalsThisMonth}
      />
    </div>
  );
}
