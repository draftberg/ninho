"use client";

import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { formatBRL } from "@/lib/format";

ChartJS.register(ArcElement, Tooltip, Legend);

export function DonutChart({
  labels,
  values,
  colors,
}: {
  labels: string[];
  values: number[];
  colors: string[];
}) {
  const total = values.reduce((sum, v) => sum + v, 0);

  if (total === 0) {
    return <p className="empty-state">Sem lançamentos neste período.</p>;
  }

  return (
    <div style={{ position: "relative", height: 220 }}>
      <Doughnut
        data={{
          labels,
          datasets: [
            {
              data: values,
              backgroundColor: colors,
              borderWidth: 0,
            },
          ],
        }}
        options={{
          plugins: {
            legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => `${ctx.label}: ${formatBRL(ctx.parsed)}`,
              },
            },
          },
          cutout: "62%",
          maintainAspectRatio: false,
        }}
      />
    </div>
  );
}
