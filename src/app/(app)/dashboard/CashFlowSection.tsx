"use client";

import { useState } from "react";
import type { MonthColumn } from "@/lib/cashflow";
import { formatBRL } from "@/lib/format";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { CashFlowMonths } from "./CashFlowMonths";

export function CashFlowSection({ columns }: { columns: MonthColumn[] }) {
  const [selecionado, setSelecionado] = useState<number | null>(null);
  const destaque = columns[selecionado ?? 0];

  return (
    <>
      <div className="chart-card cashflow-card">
        {destaque && (
          <div className="cashflow-hero">
            <div>
              <span className="cashflow-hero-label">
                {destaque.label}
                {destaque.projetado && <span className="cashflow-badge">previsto</span>}
              </span>
              <div
                className={`cashflow-hero-valor ${destaque.saldoAcumulado >= 0 ? "saldo-positivo" : "saldo-negativo"}`}
              >
                {formatBRL(destaque.saldoAcumulado)}
              </div>
              <span className="cashflow-hero-sub">saldo acumulado</span>
            </div>
            <div className="cashflow-legend">
              <span className="cashflow-legend-item entrada">
                <i /> {formatBRL(destaque.totalEntrada)}
              </span>
              <span className="cashflow-legend-item saida">
                <i /> {formatBRL(destaque.totalSaida)}
              </span>
            </div>
          </div>
        )}
        <CashFlowChart
          labels={columns.map((c) => c.label)}
          entradas={columns.map((c) => c.totalEntrada)}
          saidas={columns.map((c) => c.totalSaida)}
          selecionado={selecionado}
          onSelecionar={setSelecionado}
        />
      </div>
      <CashFlowMonths columns={columns} selecionado={selecionado} onSelecionar={setSelecionado} />
    </>
  );
}
