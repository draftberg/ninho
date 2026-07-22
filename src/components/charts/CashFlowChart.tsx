"use client";

import {
  Chart as ChartJS,
  BarController,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  type ChartEvent,
  type ActiveElement,
} from "chart.js";
import { Chart } from "react-chartjs-2";
import { formatBRL } from "@/lib/format";

ChartJS.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip);

const CORES = {
  entrada: { forte: "#2B5049", fraca: "rgba(43, 80, 73, 0.2)" },
  saida: { forte: "#D9836F", fraca: "rgba(217, 131, 111, 0.2)" },
};

function corFlat(tone: { forte: string; fraca: string }, selecionado: number | null) {
  return (ctx: { dataIndex: number }) =>
    selecionado == null || ctx.dataIndex === selecionado ? tone.forte : tone.fraca;
}

export function CashFlowChart({
  labels,
  entradas,
  saidas,
  selecionado,
  onSelecionar,
}: {
  labels: string[];
  entradas: number[];
  saidas: number[];
  selecionado: number | null;
  onSelecionar: (index: number | null) => void;
}) {
  return (
    <div style={{ position: "relative", height: 240 }}>
      <Chart
        type="bar"
        data={{
          labels,
          datasets: [
            {
              label: "Total de entrada",
              data: entradas,
              backgroundColor: corFlat(CORES.entrada, selecionado),
              borderRadius: 6,
              borderSkipped: false,
              categoryPercentage: 0.6,
              barPercentage: 0.9,
            },
            {
              label: "Total de saída",
              data: saidas,
              backgroundColor: corFlat(CORES.saida, selecionado),
              borderRadius: 6,
              borderSkipped: false,
              categoryPercentage: 0.6,
              barPercentage: 0.9,
            },
          ],
        }}
        options={{
          animation: { duration: 600, easing: "easeOutQuart" },
          transitions: { active: { animation: { duration: 200 } } },
          interaction: { mode: "index", intersect: false },
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
            legend: { display: false },
            tooltip: {
              backgroundColor: "rgba(23, 26, 33, 0.92)",
              padding: 10,
              cornerRadius: 10,
              displayColors: true,
              usePointStyle: true,
              boxPadding: 4,
              titleFont: { size: 12, weight: "bold" },
              bodyFont: { size: 12 },
              callbacks: {
                label: (ctx) => `${ctx.dataset.label}: ${formatBRL(ctx.parsed.y ?? 0)}`,
              },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: { font: { size: 11 } },
            },
            y: {
              grid: { color: "rgba(0, 0, 0, 0.05)" },
              border: { display: false },
              ticks: { display: false },
            },
          },
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
}
