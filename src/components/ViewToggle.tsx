"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type Vista = "categoria" | "pessoa";

export function ViewToggle({ vista }: { vista: Vista }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setVista(next: Vista) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("vista", next);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="view-toggle">
      <button
        type="button"
        className={vista === "categoria" ? "active" : ""}
        onClick={() => setVista("categoria")}
      >
        Por categoria
      </button>
      <button
        type="button"
        className={vista === "pessoa" ? "active" : ""}
        onClick={() => setVista("pessoa")}
      >
        Por pessoa
      </button>
    </div>
  );
}
