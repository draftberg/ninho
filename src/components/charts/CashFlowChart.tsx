"use client";

import {
  Chart as ChartJS,
  BarElement,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { formatBRL } from "@/lib/format";

ChartJS.register(BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

export function CashFlowChart({
  labels,
  entradas,
  saidas,
  saldoMes,
  saldoAcumulado,
}: {
  labels: string[];
  entradas: number[];
  saidas: number[];
  saldoMes: number[];
  saldoAcumulado: number[];
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
              label: "Entradas",
              data: entradas,
              backgroundColor: "#2B5049",
              borderRadius: 4,
              yAxisID: "y",
            },
            {
              type: "bar" as const,
              label: "Gastos",
              data: saidas,
              backgroundColor: "#D9836F",
              borderRadius: 4,
              yAxisID: "y",
            },
            {
              type: "line" as const,
              label: "Saldo do mês",
              data: saldoMes,
              borderColor: "#2B537F",
              backgroundColor: "#2B537F",
              borderDash: [4, 3],
              pointRadius: 2,
              tension: 0.25,
              yAxisID: "y",
            },
            {
              type: "line" as const,
              label: "Saldo acumulado",
              data: saldoAcumulado,
              borderColor: "#C99A3E",
              backgroundColor: "#C99A3E",
              borderWidth: 2.5,
              pointRadius: 3,
              tension: 0.25,
              yAxisID: "y1",
            },
          ],
        }}
        options={{
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
