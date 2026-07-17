"use client";

import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { formatBRL } from "@/lib/format";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export function EvolutionBarChart({
  labels,
  entradas,
  saidas,
}: {
  labels: string[];
  entradas: number[];
  saidas: number[];
}) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          { label: "Entradas", data: entradas, backgroundColor: "#2B5049", borderRadius: 4 },
          { label: "Saídas", data: saidas, backgroundColor: "#D9836F", borderRadius: 4 },
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
        },
        maintainAspectRatio: false,
      }}
    />
  );
}
