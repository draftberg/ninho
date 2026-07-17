"use client";

import { useTransition } from "react";
import { deleteEntry } from "@/lib/actions";

export function DeleteButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Excluir este lançamento?")) return;
    startTransition(() => {
      deleteEntry(id);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="delete-button"
      aria-label="Excluir lançamento"
    >
      ✕
    </button>
  );
}
