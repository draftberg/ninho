import { createClient } from "@/lib/supabase/server";
import {
  fetchAllEntries,
  fetchGoals,
  fetchChecklistItems,
  fetchChecklistStatus,
  fetchProfiles,
} from "@/lib/data";
import {
  monthOptions,
  filterByMonth,
  yearOptions,
  filterByYear,
  sumByTipo,
  totalByGoal,
  composicaoPorCategoria,
  composicaoPorPessoa,
  evolucaoUltimosMeses,
  evolucaoAnoInteiro,
  porPessoa,
} from "@/lib/aggregate";
import { buildCashFlow } from "@/lib/cashflow";
import { formatBRL, monthLabel } from "@/lib/format";
import { categoriaLabel, salarioParcelas, type Tipo } from "@/lib/types";
import { personColorClass, personColorHex, personNameFor } from "@/lib/allowlist";
import {
  WalletIcon,
  TrendUpIcon,
  TrendDownIcon,
  ChartLineUpIcon,
  PiggyBankIcon,
  UserCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { DonutChart } from "@/components/charts/DonutChart";
import { EvolutionBarChart } from "@/components/charts/EvolutionBarChart";
import { MonthFilter } from "./MonthFilter";
import { YearFilter } from "./YearFilter";
import { PeriodToggle, type Periodo } from "./PeriodToggle";
import { InsightsCard } from "./InsightsCard";
import { CashFlowTable } from "./CashFlowTable";
import { MiniCalendarPanel } from "./MiniCalendarPanel";
import type { IncomeMarker } from "../calendario/CalendarGrid";
import { ChecklistItemRow } from "../checklist/ChecklistItemRow";
import Link from "next/link";
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

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; ano?: string; vista?: string; periodo?: string; cal?: string }>;
}) {
  const { mes, ano, vista: vistaParam, periodo: periodoParam, cal } = await searchParams;
  const vista: Vista = vistaParam === "pessoa" ? "pessoa" : "categoria";
  const periodo: Periodo = periodoParam === "ano" ? "ano" : "mes";
  const calMes = cal && /^\d{4}-\d{2}$/.test(cal) ? cal : currentMonthKey();
  const [calYear, calMonth] = calMes.split("-").map(Number);
  const supabase = await createClient();
  const [allEntries, goals, checklistItems, profiles, calStatus] = await Promise.all([
    fetchAllEntries(supabase),
    fetchGoals(supabase),
    fetchChecklistItems(supabase),
    fetchProfiles(supabase),
    fetchChecklistStatus(supabase, calMes),
  ]);

  const months = monthOptions(allEntries);
  const years = yearOptions(allEntries);
  const selectedMonth = mes && (mes === "todos" || months.includes(mes)) ? mes : (months[0] ?? "todos");
  const selectedYear = ano && years.includes(ano) ? ano : (years[0] ?? String(new Date().getFullYear()));

  const filtered =
    periodo === "ano" ? filterByYear(allEntries, selectedYear) : filterByMonth(allEntries, selectedMonth);

  const totalEntrada = sumByTipo(filtered, "entrada");
  const totalSaida = sumByTipo(filtered, "saida");
  const totalInvestimento = sumByTipo(filtered, "investimento");
  const saldo = totalEntrada - totalSaida - totalInvestimento;
  const metaBebe = goals.find((g) => g.especial_bebe);
  const reservaBebe = metaBebe ? totalByGoal(filtered, metaBebe.id) : 0;

  const donutEntrada = donutFor(filtered, "entrada", vista);
  const donutSaida = donutFor(filtered, "saida", vista);
  const donutInvestimento = donutFor(filtered, "investimento", vista);

  const evolucao =
    periodo === "ano" ? evolucaoAnoInteiro(allEntries, selectedYear) : evolucaoUltimosMeses(allEntries);
  const pessoas = porPessoa(filtered);
  const fluxoDeCaixa = periodo === "ano" ? buildCashFlow(allEntries, checklistItems, profiles, selectedYear) : [];

  const calEntries = allEntries.filter((e) => e.date.startsWith(calMes));
  const calGoals = goals.filter((g) => g.data_alvo?.startsWith(calMes));
  const calDoneItemIds = new Set(calStatus.filter((s) => s.concluido).map((s) => s.item_id));
  const calIncomes: IncomeMarker[] = profiles.flatMap((p) =>
    salarioParcelas(p).map((parcela, i) => ({
      id: `${p.id}-${i}`,
      nome: personNameFor(p.email),
      dia: parcela.dia,
      valor: parcela.valor,
    })),
  );

  const checklistConcluidos = checklistItems.filter((i) => calDoneItemIds.has(i.id)).length;

  return (
    <div className="dashboard-layout">
      <div className="dashboard-main">
        <h2 className="section-title">Painel</h2>

        {periodo === "mes" && selectedMonth !== "todos" && <InsightsCard mes={selectedMonth} />}

        <ViewToggle vista={vista} />
        <PeriodToggle periodo={periodo} />
        {periodo === "ano" ? (
          <YearFilter years={years} selected={selectedYear} />
        ) : (
          <MonthFilter months={months} selected={selectedMonth} />
        )}

        <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            <WalletIcon size={15} weight="bold" /> Saldo do período
          </div>
          <div className={`kpi-value ${saldo >= 0 ? "saldo-positivo" : "saldo-negativo"}`}>
            {formatBRL(saldo)}
          </div>
        </div>
        <div className="kpi-card entradas">
          <div className="kpi-label">
            <TrendUpIcon size={15} weight="bold" /> Entradas
          </div>
          <div className="kpi-value">{formatBRL(totalEntrada)}</div>
        </div>
        <div className="kpi-card saidas">
          <div className="kpi-label">
            <TrendDownIcon size={15} weight="bold" /> Saídas
          </div>
          <div className="kpi-value">{formatBRL(totalSaida)}</div>
        </div>
        <div className="kpi-card investido">
          <div className="kpi-label">
            <ChartLineUpIcon size={15} weight="bold" /> Investido
          </div>
          <div className="kpi-value">{formatBRL(totalInvestimento)}</div>
        </div>
        <div className="kpi-card reserva">
          <div className="kpi-label">
            <PiggyBankIcon size={15} weight="bold" /> {metaBebe?.nome ?? "Reserva do bebê"}
          </div>
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
          <div className="section-title">
            {periodo === "ano" ? `Entradas x Saídas (${selectedYear})` : "Entradas x Saídas (últimos meses)"}
          </div>
          <EvolutionBarChart
            labels={evolucao.labels}
            entradas={evolucao.entradas}
            saidas={evolucao.saidas}
          />
        </div>
      </div>

      {periodo === "ano" && (
        <>
          <div className="section-title">Fluxo de caixa mensal — {selectedYear}</div>
          <p className="entry-meta cashflow-hint">
            Meses futuros sem lançamentos usam o salário base do perfil e os itens do checklist como
            previsão.
          </p>
          <CashFlowTable columns={fluxoDeCaixa} />
        </>
      )}

      <div className="section-title">Por pessoa</div>
      <div className="person-breakdown">
        {pessoas.length === 0 && <p className="empty-state">Sem lançamentos neste período.</p>}
        {pessoas.map((p) => (
          <div key={p.autor} className={`card person-card ${personColorClass(p.autor)}`}>
            <h3>
              <UserCircleIcon size={17} weight="fill" /> {p.autor}
            </h3>
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

      <div className="dashboard-side">
        <MiniCalendarPanel
          year={calYear}
          month={calMonth}
          entries={calEntries}
          items={checklistItems}
          doneItemIds={calDoneItemIds}
          goals={calGoals}
          incomes={calIncomes}
        />

        <div className="mini-checklist card">
          <div className="mini-checklist-header">
            <span>Checklist — {monthLabel(calMes)}</span>
            <Link href="/checklist" className="mini-checklist-link">
              Ver tudo
            </Link>
          </div>
          <p className="entry-meta">
            {checklistConcluidos} de {checklistItems.length} concluídos
          </p>
          {checklistItems.length === 0 && (
            <p className="empty-state small">Nenhum item cadastrado ainda.</p>
          )}
          <div className="checklist-list mini">
            {checklistItems.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                mes={calMes}
                concluido={calDoneItemIds.has(item.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
