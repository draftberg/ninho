"use client";

import { useRouter, usePathname } from "next/navigation";
import { TIPO_LABELS, type Tipo } from "@/lib/types";

const TIPOS: Tipo[] = ["entrada", "saida", "investimento"];

export function FiltersBar({
  autores,
  autor,
  tipo,
}: {
  autores: string[];
  autor: string;
  tipo: string;
}) {
  const router = useRouter();
  const pathname = usePathname();

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams({ autor, tipo });
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="filters-bar">
      <select value={autor} onChange={(e) => updateParam("autor", e.target.value)}>
        <option value="todos">Todas as pessoas</option>
        {autores.map((a) => (
          <option key={a} value={a}>
            {a}
          </option>
        ))}
      </select>

      <select value={tipo} onChange={(e) => updateParam("tipo", e.target.value)}>
        <option value="todos">Todos os tipos</option>
        {TIPOS.map((t) => (
          <option key={t} value={t}>
            {TIPO_LABELS[t]}
          </option>
        ))}
      </select>
    </div>
  );
}
