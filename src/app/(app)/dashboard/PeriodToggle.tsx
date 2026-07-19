"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type Periodo = "mes" | "ano";

export function PeriodToggle({ periodo }: { periodo: Periodo }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setPeriodo(next: Periodo) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("periodo", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="view-toggle">
      <button
        type="button"
        className={periodo === "mes" ? "active" : ""}
        onClick={() => setPeriodo("mes")}
      >
        Por mês
      </button>
      <button
        type="button"
        className={periodo === "ano" ? "active" : ""}
        onClick={() => setPeriodo("ano")}
      >
        Por ano
      </button>
    </div>
  );
}
