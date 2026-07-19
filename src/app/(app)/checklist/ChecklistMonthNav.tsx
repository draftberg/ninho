"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { monthLabel } from "@/lib/format";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

function shiftMonth(mes: string, delta: number): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ChecklistMonthNav({ mes }: { mes: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function go(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("mes", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="month-filter">
      <button type="button" onClick={() => go(shiftMonth(mes, -1))} aria-label="Mês anterior">
        <CaretLeftIcon size={16} />
      </button>
      <strong>{monthLabel(mes)}</strong>
      <button type="button" onClick={() => go(shiftMonth(mes, 1))} aria-label="Próximo mês">
        <CaretRightIcon size={16} />
      </button>
    </div>
  );
}
