"use client";

import { useState, useTransition } from "react";
import {
  toggleChecklistItem,
  deleteChecklistItem,
  confirmarChecklistItem,
  desconfirmarChecklistItem,
  updateChecklistItemPessoa,
} from "@/lib/actions";
import { formatBRL } from "@/lib/format";
import { categoriaIcon } from "@/lib/category-icons";
import { checklistTone } from "@/lib/checklist-status";
import { PERSON_DISPLAY_NAMES, personColorClass } from "@/lib/allowlist";
import type { ChecklistItem } from "@/lib/types";
import { CheckCircleIcon, CircleIcon, TrashIcon, CreditCardIcon } from "@phosphor-icons/react";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function categoryIconBadge(categoria: string, tone: "entrada" | "saida") {
  const Icon = categoriaIcon(categoria);
  return (
    <span className={`category-icon ${tone}`}>
      <Icon size={14} weight="bold" />
    </span>
  );
}

export function ChecklistItemRow({
  item,
  mes,
  concluido,
  valorCalculado,
}: {
  item: ChecklistItem;
  mes: string;
  concluido: boolean;
  valorCalculado?: number | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const isReceber = item.tipo === "a_receber";
  const isCartao = Boolean(item.origem_cartao_id);
  const isManual = !item.origem_profile_id && !item.origem_cartao_id && !item.origem_financiamento_id;
  const podeConfirmar = Boolean(item.categoria && item.subcategoria) && !isCartao;
  const valorExibido = valorCalculado ?? item.valor_esperado;
  const tone = checklistTone(item.dia_vencimento, mes, concluido);

  function handlePessoaChange(pessoa: string) {
    startTransition(() => {
      updateChecklistItemPessoa(item.id, pessoa);
    });
  }

  function handleToggle() {
    startTransition(() => {
      toggleChecklistItem(item.id, mes, !concluido);
    });
  }

  function handleDelete() {
    if (!confirm(`Remover "${item.nome}" do checklist?`)) return;
    startTransition(() => {
      deleteChecklistItem(item.id);
    });
  }

  function handleCheckClick() {
    if (podeConfirmar) {
      if (concluido) {
        if (!confirm("Desfazer a confirmação? O lançamento criado será excluído.")) return;
        startTransition(() => {
          desconfirmarChecklistItem(item.id, mes);
        });
      } else {
        setConfirming(true);
      }
      return;
    }
    handleToggle();
  }

  if (confirming) {
    const defaultDate = item.dia_vencimento ? `${mes}-${pad(item.dia_vencimento)}` : `${mes}-01`;
    return (
      <form
        className="checklist-item confirm-renda"
        action={async (formData) => {
          const valor = Number(formData.get("valor"));
          const date = formData.get("date") as string;
          setConfirming(false);
          startTransition(() => {
            confirmarChecklistItem(item.id, mes, valor, date);
          });
        }}
      >
        <div className="confirm-renda-header">
          {item.categoria && categoryIconBadge(item.categoria, isReceber ? "entrada" : "saida")}
          <span className="checklist-item-nome">{item.nome}</span>
        </div>
        <div className="confirm-renda-fields">
          <input
            type="number"
            name="valor"
            step="0.01"
            min="0.01"
            defaultValue={item.valor_esperado ?? ""}
            required
            className="valor-input"
          />
          <input type="date" name="date" defaultValue={defaultDate} required />
        </div>
        <div className="confirm-renda-actions">
          <button type="button" className="secondary-button" onClick={() => setConfirming(false)}>
            Cancelar
          </button>
          <button type="submit" className="primary-button">
            Confirmar
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className={`checklist-item tone-${tone}${concluido ? " done" : ""}`}>
      <button
        type="button"
        className="checklist-check"
        onClick={handleCheckClick}
        disabled={isPending}
        aria-label={concluido ? "Marcar como pendente" : "Marcar como concluído"}
      >
        {concluido ? <CheckCircleIcon size={22} weight="fill" /> : <CircleIcon size={22} />}
      </button>
      {isCartao ? (
        <span className="category-icon saida">
          <CreditCardIcon size={14} weight="bold" />
        </span>
      ) : (
        item.categoria && categoryIconBadge(item.categoria, isReceber ? "entrada" : "saida")
      )}
      <div className="checklist-item-main">
        <span className="checklist-item-nome">{item.nome}</span>
        {item.dia_vencimento && (
          <span className="entry-meta">
            {isReceber ? "Recebe" : "Vence"} dia {item.dia_vencimento}
          </span>
        )}
      </div>
      {isManual ? (
        <select
          className={`checklist-item-pessoa-select ${personColorClass(item.pessoa ?? "")}`}
          value={item.pessoa ?? ""}
          onChange={(e) => handlePessoaChange(e.target.value)}
          disabled={isPending}
        >
          <option value="" disabled>
            Dono?
          </option>
          {PERSON_DISPLAY_NAMES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      ) : (
        item.pessoa && (
          <span className={`checklist-item-pessoa ${personColorClass(item.pessoa)}`}>{item.pessoa}</span>
        )
      )}
      {valorExibido != null && (
        <span className={isReceber ? "mono entrada" : "mono"}>{formatBRL(valorExibido)}</span>
      )}
      {!item.origem_profile_id && !item.origem_cartao_id && !item.origem_financiamento_id && (
        <button
          type="button"
          className="delete-button"
          onClick={handleDelete}
          disabled={isPending}
          aria-label="Remover item"
        >
          <TrashIcon size={16} />
        </button>
      )}
    </div>
  );
}
