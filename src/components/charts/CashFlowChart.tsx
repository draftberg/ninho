"use client";

import {
  Chart as ChartJS,
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  type ChartEvent,
  type ActiveElement,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { formatBRL } from "@/lib/format";

ChartJS.register(
  BarController,
  LineController,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

const CORES = {
  entrada: { cheia: "#2B5049", fraca: "rgba(43, 80, 73, 0.3)" },
  saida: { cheia: "#D9836F", fraca: "rgba(217, 131, 111, 0.3)" },
  saldoMes: { cheia: "#2B537F", fraca: "rgba(43, 83, 127, 0.35)" },
  saldoAcumulado: { cheia: "#C99A3E", fraca: "rgba(201, 154, 62, 0.35)" },
};

function corPorIndice(tom: { cheia: string; fraca: string }, selecionado: number | null) {
  return (ctx: { dataIndex: number }) =>
    selecionado == null || ctx.dataIndex === selecionado ? tom.cheia : tom.fraca;
}

export function CashFlowChart({
  labels,
  entradas,
  saidas,
  saldoMes,
  saldoAcumulado,
  selecionado,
  onSelecionar,
}: {
  labels: string[];
  entradas: number[];
  saidas: number[];
  saldoMes: number[];
  saldoAcumulado: number[];
  selecionado: number | null;
  onSelecionar: (index: number | null) => void;
}) {
  return (
    <div style={{ position: "relative", height: 280 }}>
      <Chart
        type="bar"
        data={{
          labels,
          datasets: [
            {
              type: "bar" as const,
              label: "Total de entrada",
              data: entradas,
              backgroundColor: corPorIndice(CORES.entrada, selecionado),
              borderRadius: 4,
              yAxisID: "y",
            },
            {
              type: "bar" as const,
              label: "Total de saída",
              data: saidas,
              backgroundColor: corPorIndice(CORES.saida, selecionado),
              borderRadius: 4,
              yAxisID: "y",
            },
            {
              type: "line" as const,
              label: "Saldo mensal",
              data: saldoMes,
              borderColor: CORES.saldoMes.cheia,
              backgroundColor: CORES.saldoMes.cheia,
              borderDash: [4, 3],
              pointRadius: (ctx) => (ctx.dataIndex === selecionado ? 5 : 2),
              pointBackgroundColor: corPorIndice(CORES.saldoMes, selecionado),
              tension: 0.25,
              yAxisID: "y",
            },
            {
              type: "line" as const,
              label: "Saldo acumulado",
              data: saldoAcumulado,
              borderColor: CORES.saldoAcumulado.cheia,
              backgroundColor: CORES.saldoAcumulado.cheia,
              borderWidth: 2.5,
              pointRadius: (ctx) => (ctx.dataIndex === selecionado ? 6 : 3),
              pointBackgroundColor: corPorIndice(CORES.saldoAcumulado, selecionado),
              tension: 0.25,
              yAxisID: "y1",
            },
          ],
        }}
        options={{
          onClick: (_event: ChartEvent, elements: ActiveElement[]) => {
            if (elements.length === 0) return;
            const index = elements[0].index;
            onSelecionar(index === selecionado ? null : index);
          },
          onHover: (event) => {
            if (event.native?.target instanceof HTMLElement) {
              event.native.target.style.cursor = "pointer";
            }
          },
          plugins: {
            legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${formatBRL(ctx.parsed.y ?? 0)}`,
              },
            },
          },
          scales: {
            y: { ticks: { callback: (v) => formatBRL(Number(v)) } },
            y1: {
              position: "right",
              grid: { drawOnChartArea: false },
              ticks: { callback: (v) => formatBRL(Number(v)) },
            },
          },
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
}
