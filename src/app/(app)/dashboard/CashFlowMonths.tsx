"use client";

import { formatBRL } from "@/lib/format";
import type { MonthColumn } from "@/lib/cashflow";
import { TrendUpIcon, TrendDownIcon } from "@phosphor-icons/react";

export function CashFlowMonths({
  columns,
  selecionado,
  onSelecionar,
}: {
  columns: MonthColumn[];
  selecionado: number | null;
  onSelecionar: (index: number | null) => void;
}) {
  return (
    <div className="cashflow-months">
      {columns.map((c, i) => (
        <button
          type="button"
          key={c.key}
          className={`cashflow-month-card${selecionado === i ? " active" : ""}`}
          onClick={() => onSelecionar(i === selecionado ? null : i)}
        >
          <div className="cashflow-month-header">
            <span>{c.label}</span>
            {c.projetado && <span className="cashflow-badge">previsto</span>}
          </div>
          <div className="cashflow-month-row entrada">
            <TrendUpIcon size={13} weight="bold" />
            {formatBRL(c.totalEntrada)}
          </div>
          <div className="cashflow-month-row saida">
            <TrendDownIcon size={13} weight="bold" />
            {formatBRL(c.totalSaida)}
          </div>
          <div className={`cashflow-month-row saldo ${c.saldoMes >= 0 ? "saldo-positivo" : "saldo-negativo"}`}>
            Saldo mensal: {formatBRL(c.saldoMes)}
          </div>
          <div
            className={`cashflow-month-acumulado ${c.saldoAcumulado >= 0 ? "saldo-positivo" : "saldo-negativo"}`}
          >
            {formatBRL(c.saldoAcumulado)}
          </div>
        </button>
      ))}
    </div>
  );
}
