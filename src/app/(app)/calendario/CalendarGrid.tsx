import type { ChecklistItem, Entry, Goal } from "@/lib/types";
import { FlagIcon, MoneyIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatCompact(v: number): string {
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

export function CalendarGrid({
  year,
  month,
  entries,
  items,
  doneItemIds,
  goals,
}: {
  year: number;
  month: number;
  entries: Entry[];
  items: ChecklistItem[];
  doneItemIds: Set<string>;
  goals: Goal[];
}) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();

  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="calendar">
      <div className="calendar-weekdays">
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar-weekday">
            {w}
          </div>
        ))}
      </div>
      <div className="calendar-grid">
        {cells.map((day, i) => {
          if (day === null) return <div key={`blank-${i}`} className="calendar-cell empty" />;

          const dateStr = `${year}-${pad(month)}-${pad(day)}`;
          const dayEntries = entries.filter((e) => e.date === dateStr);
          const entradaSum = dayEntries
            .filter((e) => e.tipo === "entrada")
            .reduce((sum, e) => sum + Number(e.valor), 0);
          const saidaSum = dayEntries
            .filter((e) => e.tipo === "saida")
            .reduce((sum, e) => sum + Number(e.valor), 0);
          const dayItems = items.filter((it) => it.dia_vencimento === day && it.tipo === "a_pagar");
          const dayIncomes = items.filter((it) => it.dia_vencimento === day && it.tipo === "a_receber");
          const dayGoals = goals.filter((g) => g.data_alvo === dateStr);

          const isToday = new Date().toISOString().slice(0, 10) === dateStr;

          return (
            <Link
              key={dateStr}
              href={`/historico?date=${dateStr}`}
              className={`calendar-cell${isToday ? " today" : ""}`}
            >
              <span className="calendar-daynum">{day}</span>
              {(entradaSum > 0 || saidaSum > 0) && (
                <div className="calendar-totals">
                  {entradaSum > 0 && (
                    <span className="calendar-total entrada">+R$ {formatCompact(entradaSum)}</span>
                  )}
                  {saidaSum > 0 && (
                    <span className="calendar-total saida">-R$ {formatCompact(saidaSum)}</span>
                  )}
                </div>
              )}
              {dayIncomes.length > 0 && (
                <div className="calendar-chips">
                  {dayIncomes.map((inc) => (
                    <span
                      key={inc.id}
                      className={`calendar-chip income${doneItemIds.has(inc.id) ? " done" : ""}`}
                    >
                      <MoneyIcon size={10} weight="fill" /> {inc.nome}
                      {inc.valor_esperado != null && ` R$ ${formatCompact(inc.valor_esperado)}`}
                    </span>
                  ))}
                </div>
              )}
              {dayItems.length > 0 && (
                <div className="calendar-chips">
                  {dayItems.map((item) => (
                    <span
                      key={item.id}
                      className={`calendar-chip${doneItemIds.has(item.id) ? " done" : ""}`}
                    >
                      {item.nome}
                    </span>
                  ))}
                </div>
              )}
              {dayGoals.length > 0 && (
                <div className="calendar-chips">
                  {dayGoals.map((g) => (
                    <span key={g.id} className="calendar-chip goal">
                      <FlagIcon size={10} weight="fill" /> {g.nome}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
