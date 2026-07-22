"use client";

import { useMemo, useState } from "react";
import { buildRollingCashFlow } from "@/lib/cashflow";
import { formatBRL } from "@/lib/format";
import { PERSON_DISPLAY_NAMES } from "@/lib/allowlist";
import type { ChecklistItem, Entry, Profile } from "@/lib/types";
import { CashFlowChart } from "@/components/charts/CashFlowChart";
import { CashFlowMonths } from "./CashFlowMonths";

type Visao = "casal" | string;

export function CashFlowSection({
  allEntries,
  checklistItems,
  profiles,
}: {
  allEntries: Entry[];
  checklistItems: ChecklistItem[];
  profiles: Profile[];
}) {
  const [visao, setVisao] = useState<Visao>("casal");
  const [selecionado, setSelecionado] = useState<number | null>(null);

  const columns = useMemo(
    () =>
      buildRollingCashFlow(allEntries, checklistItems, profiles, 12, visao === "casal" ? null : visao),
    [allEntries, checklistItems, profiles, visao],
  );

  const destaque = columns[selecionado ?? 0];

  function mudarVisao(next: Visao) {
    setVisao(next);
    setSelecionado(null);
  }

  return (
    <>
      <div className="cashflow-visao-toggle">
        <button type="button" className={visao === "casal" ? "active" : ""} onClick={() => mudarVisao("casal")}>
          Casal
        </button>
        {PERSON_DISPLAY_NAMES.map((nome) => (
          <button
            type="button"
            key={nome}
            className={visao === nome ? "active" : ""}
            onClick={() => mudarVisao(nome)}
          >
            {nome}
          </button>
        ))}
      </div>

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
          saldoAcumulado={columns.map((c) => c.saldoAcumulado)}
          selecionado={selecionado}
          onSelecionar={setSelecionado}
        />
      </div>
      <CashFlowMonths columns={columns} selecionado={selecionado} onSelecionar={setSelecionado} />
    </>
  );
}
