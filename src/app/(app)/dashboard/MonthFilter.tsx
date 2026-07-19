"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { monthLabel } from "@/lib/format";

export function MonthFilter({ months, selected }: { months: string[]; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="month-filter">
      <label htmlFor="mes">Mês</label>
      <select id="mes" value={selected} onChange={(e) => handleChange(e.target.value)}>
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
