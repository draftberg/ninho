import { createClient } from "@/lib/supabase/server";
import { fetchAllEntries } from "@/lib/data";
import {
  monthOptions,
  filterByMonth,
  sumByTipo,
  reservaBebeTotal,
  composicaoPorCategoria,
  composicaoPorPessoa,
  evolucaoUltimosMeses,
  porPessoa,
} from "@/lib/aggregate";
import { formatBRL } from "@/lib/format";
import { categoriaLabel, type Tipo } from "@/lib/types";
import { personColorClass, personColorHex } from "@/lib/allowlist";
import { DonutChart } from "@/components/charts/DonutChart";
import { EvolutionBarChart } from "@/components/charts/EvolutionBarChart";
import { MonthFilter } from "./MonthFilter";
import { ViewToggle, type Vista } from "@/components/ViewToggle";

// matiz base de cada tipo — as cores das fatias variam a claridade a partir daqui,
// então a paleta se adapta automaticamente ao número de categorias de cada tipo.
const DONUT_HUE: Record<Tipo, number> = {
  entrada: 152, // verde
  saida: 14, // coral
  investimento: 262, // roxo
};

function hslToHex(h: number, sPercent: number, lPercent: number): string {
  const s = sPercent / 100;
  const l = lPercent / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function paletteFor(tipo: Tipo, count: number): string[] {
  const hue = DONUT_HUE[tipo];
  if (count <= 1) return [hslToHex(hue, 45, 32)];
  const minLightness = 26;
  const maxLightness = 78;
  return Array.from({ length: count }, (_, i) => {
    const l = minLightness + ((maxLightness - minLightness) * i) / (count - 1);
    return hslToHex(hue, 48, l);
  });
}

function donutFor(
  filtered: ReturnType<typeof filterByMonth>,
  tipo: Tipo,
  vista: Vista,
): { labels: string[]; values: number[]; colors: string[] } {
  if (vista === "pessoa") {
    const composicao = composicaoPorPessoa(filtered, tipo);
    return {
      labels: composicao.labels,
      values: composicao.values,
      colors: composicao.labels.map((autor) => personColorHex(autor)),
    };
  }

  const composicao = composicaoPorCategoria(filtered, tipo);
  return {
    labels: composicao.labels.map((v) => categoriaLabel(tipo, v)),
    values: composicao.values,
    colors: paletteFor(tipo, composicao.labels.length),
  };
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; vista?: string }>;
}) {
  const { mes, vista: vistaParam } = await searchParams;
  const vista: Vista = vistaParam === "pessoa" ? "pessoa" : "categoria";
  const supabase = await createClient();
  const allEntries = await fetchAllEntries(supabase);

  const months = monthOptions(allEntries);
  const selectedMonth = mes && (mes === "todos" || months.includes(mes)) ? mes : (months[0] ?? "todos");
  const filtered = filterByMonth(allEntries, selectedMonth);

  const totalEntrada = sumByTipo(filtered, "entrada");
  const totalSaida = sumByTipo(filtered, "saida");
  const totalInvestimento = sumByTipo(filtered, "investimento");
  const saldo = totalEntrada - totalSaida - totalInvestimento;
  const reservaBebe = reservaBebeTotal(filtered);

  const donutEntrada = donutFor(filtered, "entrada", vista);
  const donutSaida = donutFor(filtered, "saida", vista);
  const donutInvestimento = donutFor(filtered, "investimento", vista);

  const evolucao = evolucaoUltimosMeses(allEntries);
  const pessoas = porPessoa(filtered);

  return (
    <div>
      <h2 className="section-title">Painel</h2>

      <ViewToggle vista={vista} />
      <MonthFilter months={months} selected={selectedMonth} />

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Saldo do período</div>
          <div className={`kpi-value ${saldo >= 0 ? "saldo-positivo" : "saldo-negativo"}`}>
            {formatBRL(saldo)}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Entradas</div>
          <div className="kpi-value">{formatBRL(totalEntrada)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Saídas</div>
          <div className="kpi-value">{formatBRL(totalSaida)}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Investido</div>
          <div className="kpi-value">{formatBRL(totalInvestimento)}</div>
        </div>
        <div className="kpi-card reserva">
          <div className="kpi-label">Reserva do bebê</div>
          <div className="kpi-value">{formatBRL(reservaBebe)}</div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="section-title">Entradas</div>
          <DonutChart
            labels={donutEntrada.labels}
            values={donutEntrada.values}
            colors={donutEntrada.colors}
          />
        </div>
        <div className="chart-card">
          <div className="section-title">Saídas</div>
          <DonutChart
            labels={donutSaida.labels}
            values={donutSaida.values}
            colors={donutSaida.colors}
          />
        </div>
        <div className="chart-card">
          <div className="section-title">Investimentos</div>
          <DonutChart
            labels={donutInvestimento.labels}
            values={donutInvestimento.values}
            colors={donutInvestimento.colors}
          />
        </div>
        <div className="chart-card">
          <div className="section-title">Entradas x Saídas (últimos meses)</div>
          <EvolutionBarChart
            labels={evolucao.labels}
            entradas={evolucao.entradas}
            saidas={evolucao.saidas}
          />
        </div>
      </div>

      <div className="section-title">Por pessoa</div>
      <div className="person-breakdown">
        {pessoas.length === 0 && <p className="empty-state">Sem lançamentos neste período.</p>}
        {pessoas.map((p) => (
          <div key={p.autor} className={`card person-card ${personColorClass(p.autor)}`}>
            <h3>{p.autor}</h3>
            <div className="person-row">
              <span>Entrada</span>
              <span className="mono">{formatBRL(p.entrada)}</span>
            </div>
            <div className="person-row">
              <span>Saída</span>
              <span className="mono">{formatBRL(p.saida)}</span>
            </div>
            <div className="person-row">
              <span>Investimento</span>
              <span className="mono">{formatBRL(p.investimento)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
