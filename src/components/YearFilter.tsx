"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export function YearFilter({ years, selected }: { years: string[]; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("ano", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="month-filter">
      <label htmlFor="ano">Ano</label>
      <select id="ano" value={selected} onChange={(e) => handleChange(e.target.value)}>
        {years.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </div>
  );
}
