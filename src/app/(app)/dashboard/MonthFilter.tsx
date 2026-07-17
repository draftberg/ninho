"use client";

import { useRouter, usePathname } from "next/navigation";
import { monthLabel } from "@/lib/format";

export function MonthFilter({ months, selected }: { months: string[]; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="month-filter">
      <label htmlFor="mes">Mês</label>
      <select
        id="mes"
        value={selected}
        onChange={(e) => router.push(`${pathname}?mes=${e.target.value}`)}
      >
        {months.map((m) => (
          <option key={m} value={m}>
            {monthLabel(m)}
          </option>
        ))}
        <option value="todos">Todos os meses</option>
      </select>
    </div>
  );
}
