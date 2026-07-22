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
  type ScriptableContext,
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
  entrada: { forte: "#2B5049", fraca: "rgba(43, 80, 73, 0.25)" },
  saida: { forte: "#D9836F", fraca: "rgba(217, 131, 111, 0.25)" },
  saldoMes: { forte: "#2B537F", fraca: "rgba(43, 83, 127, 0.3)" },
  saldoAcumulado: { forte: "#C99A3E", fraca: "rgba(201, 154, 62, 0.3)" },
};

function hexParaRgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Barra com gradiente vertical (mais forte embaixo) — esmaece por inteiro
// quando outro mês está selecionado, em vez de só trocar de tom sólido.
function gradienteBarra(tone: { forte: string; fraca: string }, selecionado: number | null) {
  return (ctx: ScriptableContext<"bar">) => {
    const emFoco = selecionado == null || ctx.dataIndex === selecionado;
    const { chart } = ctx;
    const area = chart.chartArea;
    if (!area) return emFoco ? tone.forte : tone.fraca;
    const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
    if (emFoco) {
      gradient.addColorStop(0, tone.forte);
      gradient.addColorStop(1, hexParaRgba(tone.forte, 0.55));
    } else {
      gradient.addColorStop(0, tone.fraca);
      gradient.addColorStop(1, tone.fraca);
    }
    return gradient;
  };
}

function corPonto(tone: { forte: string; fraca: string }, selecionado: number | null) {
  return (ctx: { dataIndex: number }) =>
    selecionado == null || ctx.dataIndex === selecionado ? tone.forte : tone.fraca;
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
    <div style={{ position: "relative", height: 300 }}>
      <Chart
        type="bar"
        data={{
          labels,
          datasets: [
            {
              type: "bar" as const,
              label: "Total de entrada",
              data: entradas,
              backgroundColor: gradienteBarra(CORES.entrada, selecionado),
              borderRadius: 8,
              borderSkipped: false,
              categoryPercentage: 0.7,
              barPercentage: 0.85,
              yAxisID: "y",
            },
            {
              type: "bar" as const,
              label: "Total de saída",
              data: saidas,
              backgroundColor: gradienteBarra(CORES.saida, selecionado),
              borderRadius: 8,
              borderSkipped: false,
              categoryPercentage: 0.7,
              barPercentage: 0.85,
              yAxisID: "y",
            },
            {
              type: "line" as const,
              label: "Saldo mensal",
              data: saldoMes,
              borderColor: CORES.saldoMes.forte,
              backgroundColor: CORES.saldoMes.forte,
              borderDash: [4, 3],
              borderWidth: 2,
              pointRadius: (ctx) => (ctx.dataIndex === selecionado ? 5 : 2),
              pointHoverRadius: 6,
              pointBackgroundColor: corPonto(CORES.saldoMes, selecionado),
              tension: 0.35,
              yAxisID: "y",
            },
            {
              type: "line" as const,
              label: "Saldo acumulado",
              data: saldoAcumulado,
              borderColor: CORES.saldoAcumulado.forte,
              backgroundColor: (ctx: ScriptableContext<"line">) => {
                const area = ctx.chart.chartArea;
                if (!area) return hexParaRgba(CORES.saldoAcumulado.forte, 0.15);
                const gradient = ctx.chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
                gradient.addColorStop(0, hexParaRgba(CORES.saldoAcumulado.forte, 0.28));
                gradient.addColorStop(1, hexParaRgba(CORES.saldoAcumulado.forte, 0));
                return gradient;
              },
              borderWidth: 2.75,
              fill: true,
              pointRadius: (ctx) => (ctx.dataIndex === selecionado ? 6 : 3),
              pointHoverRadius: 7,
              pointBackgroundColor: corPonto(CORES.saldoAcumulado, selecionado),
              tension: 0.35,
              yAxisID: "y1",
            },
          ],
        }}
        options={{
          animation: { duration: 700, easing: "easeOutQuart" },
          transitions: { active: { animation: { duration: 250 } } },
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
            legend: {
              position: "bottom",
              labels: {
                usePointStyle: true,
                pointStyle: "circle",
                boxWidth: 8,
                padding: 16,
                font: { size: 11 },
              },
            },
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
              grid: { color: "rgba(0, 0, 0, 0.06)" },
              border: { display: false },
              ticks: { callback: (v) => formatBRL(Number(v)), font: { size: 11 } },
            },
            y1: {
              position: "right",
              grid: { drawOnChartArea: false },
              border: { display: false },
              ticks: { callback: (v) => formatBRL(Number(v)), font: { size: 11 } },
            },
          },
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
}
