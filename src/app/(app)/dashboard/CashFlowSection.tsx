"use client";

import { useState } from "react";
import type { MonthColumn } from "@/lib/cashflow";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { CashFlowMonths } from "./CashFlowMonths";

export function CashFlowSection({ columns }: { columns: MonthColumn[] }) {
  const [selecionado, setSelecionado] = useState<number | null>(null);

  return (
    <>
      <div className="chart-card">
        <CashFlowChart
          labels={columns.map((c) => c.label)}
          entradas={columns.map((c) => c.totalEntrada)}
          saidas={columns.map((c) => c.totalSaida)}
          saldoMes={columns.map((c) => c.saldoMes)}
          saldoAcumulado={columns.map((c) => c.saldoAcumulado)}
          selecionado={selecionado}
          onSelecionar={setSelecionado}
        />
      </div>
      <CashFlowMonths columns={columns} selecionado={selecionado} onSelecionar={setSelecionado} />
    </>
  );
}
