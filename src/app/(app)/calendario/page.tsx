import { createClient } from "@/lib/supabase/server";
import { fetchAllEntries, fetchChecklistItems, fetchChecklistStatus, fetchGoals } from "@/lib/data";
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

  return (
    <div>
      <h2 className="section-title">Calendário</h2>
      <MonthNav mes={mes} />
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
