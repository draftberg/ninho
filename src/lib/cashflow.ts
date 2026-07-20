import { filterByMonth, sumByTipo, composicaoPorCategoria } from "@/lib/aggregate";
import { categoriaLabel, salarioTotal, type ChecklistItem, type Entry, type Profile } from "@/lib/types";
import { monthLabel, todayISO } from "@/lib/format";

export interface MonthColumn {
  key: string;
  label: string;
  projetado: boolean;
  entradasPorCategoria: { categoria: string; valor: number }[];
  totalEntrada: number;
  totalSaida: number;
  totalInvestimento: number;
  saldoAnterior: number;
  saldoMes: number;
  saldoAcumulado: number;
}

function buildColumns(
  allEntries: Entry[],
  checklistItems: ChecklistItem[],
  profiles: Profile[],
  keys: string[],
): MonthColumn[] {
  const currentMonthKey = todayISO().slice(0, 7);
  const rendaPrevista = profiles.reduce((sum, p) => sum + salarioTotal(p), 0);
  const gastosPrevistos = checklistItems.reduce((sum, i) => sum + Number(i.valor_esperado ?? 0), 0);

  const antes = allEntries.filter((e) => e.date < `${keys[0]}-01`);
  let saldoAcumulado = antes.reduce((sum, e) => {
    return e.tipo === "entrada" ? sum + Number(e.valor) : sum - Number(e.valor);
  }, 0);

  const columns: MonthColumn[] = [];

  for (const key of keys) {
    const monthEntries = filterByMonth(allEntries, key);
    const isFuture = key > currentMonthKey;
    const projetado = isFuture && monthEntries.length === 0;

    let totalEntrada: number;
    let totalSaida: number;
    let totalInvestimento: number;
    let entradasPorCategoria: { categoria: string; valor: number }[];

    if (projetado) {
      totalEntrada = rendaPrevista;
      totalSaida = gastosPrevistos;
      totalInvestimento = 0;
      entradasPorCategoria =
        rendaPrevista > 0 ? [{ categoria: categoriaLabel("entrada", "salario"), valor: rendaPrevista }] : [];
    } else {
      totalEntrada = sumByTipo(monthEntries, "entrada");
      totalSaida = sumByTipo(monthEntries, "saida");
      totalInvestimento = sumByTipo(monthEntries, "investimento");
      const composicao = composicaoPorCategoria(monthEntries, "entrada");
      entradasPorCategoria = composicao.labels.map((cat, i) => ({
        categoria: categoriaLabel("entrada", cat),
        valor: composicao.values[i],
      }));
    }

    const saldoAnterior = saldoAcumulado;
    const saldoMes = totalEntrada - totalSaida - totalInvestimento;
    saldoAcumulado = saldoAnterior + saldoMes;

    columns.push({
      key,
      label: monthLabel(key),
      projetado,
      entradasPorCategoria,
      totalEntrada,
      totalSaida,
      totalInvestimento,
      saldoAnterior,
      saldoMes,
      saldoAcumulado,
    });
  }

  return columns;
}

// Constrói o fluxo de caixa mês a mês de um ano-calendário (jan-dez) inteiro:
// meses que já aconteceram usam os lançamentos reais; meses futuros sem
// nenhum lançamento ainda usam o salário base dos perfis e os valores
// esperados do checklist como projeção, para dar previsibilidade tipo
// planilha.
export function buildCashFlow(
  allEntries: Entry[],
  checklistItems: ChecklistItem[],
  profiles: Profile[],
  year: string,
): MonthColumn[] {
  const keys = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  return buildColumns(allEntries, checklistItems, profiles, keys);
}

// Mesma lógica de buildCashFlow, mas numa janela móvel a partir do mês
// atual (mês atual + os próximos `monthsAhead` meses), em vez de um
// ano-calendário fixo — usado no Painel pra sempre mostrar a previsão dos
// próximos 12 meses, independente do filtro de ano selecionado.
export function buildRollingCashFlow(
  allEntries: Entry[],
  checklistItems: ChecklistItem[],
  profiles: Profile[],
  monthsAhead = 12,
): MonthColumn[] {
  const now = new Date();
  const keys = Array.from({ length: monthsAhead + 1 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
  return buildColumns(allEntries, checklistItems, profiles, keys);
}
