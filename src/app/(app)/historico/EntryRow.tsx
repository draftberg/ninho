"use client";

import { useState } from "react";
import { formatBRL, formatDate } from "@/lib/format";
import { TIPO_LABELS, categoriaLabel, subcategoriaLabel, type Cartao, type Entry, type Goal } from "@/lib/types";
import { categoriaIcon } from "@/lib/category-icons";
import { personColorClass } from "@/lib/allowlist";
import { PersonAvatar } from "@/components/PersonAvatar";
import type { Vista } from "@/components/ViewToggle";
import { DeleteButton } from "./DeleteButton";
import { EditEntryForm } from "./EditEntryForm";
import { PencilSimpleIcon } from "@phosphor-icons/react";

function categoryIconBadge(categoria: string, tipo: string) {
  const Icon = categoriaIcon(categoria);
  return (
    <span className={`category-icon ${tipo}`}>
      <Icon size={14} weight="bold" />
    </span>
  );
}

export function EntryRow({
  entry,
  vista,
  goals,
  cartoes,
}: {
  entry: Entry;
  vista: Vista;
  goals: Goal[];
  cartoes: Cartao[];
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <div className="entry-item entry-item-editing">
        <EditEntryForm
          entry={entry}
          goals={goals}
          cartoes={cartoes}
          onCancel={() => setEditing(false)}
          onSaved={() => setEditing(false)}
        />
      </div>
    );
  }

  const catLabel = categoriaLabel(entry.tipo, entry.categoria);
  const subLabel = subcategoriaLabel(entry.tipo, entry.categoria, entry.subcategoria);
  const sign = entry.tipo === "entrada" ? "+" : "-";
  const colorClass = vista === "pessoa" ? personColorClass(entry.autor) : entry.tipo;

  return (
    <div className="entry-item">
      <div className="entry-row">
        <PersonAvatar autor={entry.autor} />
        {categoryIconBadge(entry.categoria, entry.tipo)}
        <div className="entry-main">
          <div>
            <span className={`tag ${colorClass}`}>
              {vista === "pessoa" ? entry.autor : TIPO_LABELS[entry.tipo]}
            </span>
            <span className="entry-desc">{entry.descricao || subLabel}</span>
          </div>
          <span className="entry-meta">
            {catLabel} · {subLabel} · {formatDate(entry.date)} · {entry.autor}
          </span>
        </div>
      </div>
      <span className={`entry-valor ${colorClass}`}>
        {sign} {formatBRL(entry.valor)}
      </span>
      <button
        type="button"
        className="delete-button"
        onClick={() => setEditing(true)}
        aria-label="Editar lançamento"
      >
        <PencilSimpleIcon size={16} />
      </button>
      <DeleteButton id={entry.id} />
    </div>
  );
}
