"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { CaretLeftIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import { formatBRL } from "@/lib/format";
import type { ChecklistItem, Entry, Goal } from "@/lib/types";
import type { IncomeMarker } from "../calendario/CalendarGrid";

const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function MiniCalendarPanel({
  year,
  month,
  entries,
  items,
  doneItemIds,
  goals,
  incomes,
}: {
  year: number;
  month: number;
  entries: Entry[];
  items: ChecklistItem[];
  doneItemIds: Set<string>;
  goals: Goal[];
  incomes: IncomeMarker[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const todayStr = new Date().toISOString().slice(0, 10);
  const isCurrentMonth = todayStr.startsWith(`${year}-${pad(month)}`);
  const [selectedDay, setSelectedDay] = useState(isCurrentMonth ? Number(todayStr.slice(8, 10)) : 1);

  function gotoMonth(delta: number) {
    const d = new Date(year, month - 1 + delta, 1);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    const params = new URLSearchParams(searchParams.toString());
    params.set("cal", key);
    router.push(`${pathname}?${params.toString()}`);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstWeekday = new Date(year, month - 1, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function hasEvent(day: number): boolean {
    const dateStr = `${year}-${pad(month)}-${pad(day)}`;
    return (
      entries.some((e) => e.date === dateStr) ||
      items.some((it) => it.dia_vencimento === day) ||
      incomes.some((inc) => inc.dia === day) ||
      goals.some((g) => g.data_alvo === dateStr)
    );
  }

  const monthLabel = new Date(year, month - 1, 1)
    .toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());

  const selectedDateStr = `${year}-${pad(month)}-${pad(selectedDay)}`;
  const dayEntries = entries.filter((e) => e.date === selectedDateStr);
  const dayItems = items.filter((it) => it.dia_vencimento === selectedDay);
  const dayIncomes = incomes.filter((inc) => inc.dia === selectedDay);
  const dayGoals = goals.filter((g) => g.data_alvo === selectedDateStr);
  const dayIsEmpty =
    dayEntries.length === 0 && dayItems.length === 0 && dayIncomes.length === 0 && dayGoals.length === 0;

  return (
    <div className="mini-calendar card">
      <div className="mini-calendar-header">
        <button type="button" onClick={() => gotoMonth(-1)} aria-label="Mês anterior">
          <CaretLeftIcon size={14} />
        </button>
        <span className="mini-calendar-month">{monthLabel}</span>
        <button type="button" onClick={() => gotoMonth(1)} aria-label="Próximo mês">
          <CaretRightIcon size={14} />
        </button>
      </div>

      <div className="mini-calendar-weekdays">
        {WEEKDAYS.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>

      <div className="mini-calendar-grid">
        {cells.map((day, i) => {
          if (day === null) return <span key={`blank-${i}`} className="mini-calendar-day empty" />;
          const isToday = isCurrentMonth && day === Number(todayStr.slice(8, 10));
          const active = day === selectedDay;
          return (
            <button
              type="button"
              key={day}
              className={`mini-calendar-day${active ? " active" : ""}${isToday ? " today" : ""}`}
              onClick={() => setSelectedDay(day)}
            >
              {day}
              {hasEvent(day) && <span className="mini-calendar-dot" />}
            </button>
          );
        })}
      </div>

      <Link href="/lancar" className="mini-calendar-add">
        <PlusIcon size={14} weight="bold" /> Novo lançamento
      </Link>

      <div className="mini-calendar-timeline">
        <div className="mini-calendar-timeline-header">
          {selectedDay} de {monthLabel}
        </div>

        {dayIsEmpty && <p className="empty-state small">Nada por aqui.</p>}

        {dayIncomes.map((inc) => (
          <div key={inc.id} className="timeline-item income">
            <span className="timeline-dot" />
            <div>
              <strong>Salário — {inc.nome}</strong>
              <span className="entry-meta">{formatBRL(inc.valor)}</span>
            </div>
          </div>
        ))}

        {dayItems.map((item) => (
          <div key={item.id} className={`timeline-item checklist${doneItemIds.has(item.id) ? " done" : ""}`}>
            <span className="timeline-dot" />
            <div>
              <strong>{item.nome}</strong>
              <span className="entry-meta">
                {item.valor_esperado != null && formatBRL(item.valor_esperado)}
                {item.valor_esperado != null && " · "}
                {doneItemIds.has(item.id) ? "concluído" : "pendente"}
              </span>
            </div>
          </div>
        ))}

        {dayGoals.map((g) => (
          <div key={g.id} className="timeline-item goal">
            <span className="timeline-dot" />
            <div>
              <strong>Prazo da meta</strong>
              <span className="entry-meta">{g.nome}</span>
            </div>
          </div>
        ))}

        {dayEntries.length > 0 && (
          <div className="timeline-item entries">
            <span className="timeline-dot" />
            <div>
              <strong>
                {dayEntries.length} lançamento{dayEntries.length > 1 ? "s" : ""}
              </strong>
              <span className="entry-meta">
                {formatBRL(
                  dayEntries
                    .filter((e) => e.tipo === "entrada")
                    .reduce((sum, e) => sum + Number(e.valor), 0),
                )}{" "}
                em entradas
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
