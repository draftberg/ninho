import { filterByMonth } from "@/lib/aggregate";
import { buildRollingCashFlow } from "@/lib/cashflow";
import { goalProjections } from "@/lib/projections";
import { formatBRL, todayISO } from "@/lib/format";
import {
  categoriaLabel,
  type BudgetLimit,
  type ChecklistItem,
  type ChecklistStatus,
  type Entry,
  type Goal,
  type Profile,
} from "@/lib/types";

// Alertas calculados sem IA — reaproveita goalProjections, buildRollingCashFlow
// e a comparação orçamento x gasto já usadas em outras telas. Serve tanto
// pro indicador visual do bolhão de chat quanto como saudação proativa
// antes de qualquer mensagem ser enviada.
export function computeAlertas(
  entries: Entry[],
  goals: Goal[],
  checklistItems: ChecklistItem[],
  profiles: Profile[],
  budgetLimits: BudgetLimit[],
): string[] {
  const alertas: string[] = [];

  const projecoes = goalProjections(entries, goals).filter((p) => p.status === "atrasada");
  for (const p of projecoes) {
    alertas.push(
      `A meta "${p.goal.nome}" está atrasada: no ritmo atual (${formatBRL(p.ritmoMensal)}/mês) não vai bater o prazo — precisaria de ${formatBRL(p.valorNecessarioPorMes ?? 0)}/mês.`,
    );
  }

  const cashFlow = buildRollingCashFlow(entries, checklistItems, profiles, 12);
  const mesesComprometidos = cashFlow.filter((c) => c.saldoAcumulado < 0);
  if (mesesComprometidos.length > 0) {
    alertas.push(
      `${mesesComprometidos.length} ${mesesComprometidos.length === 1 ? "mês projetado" : "meses projetados"} com saldo negativo nos próximos 12 meses — o mais próximo é ${mesesComprometidos[0].label}.`,
    );
  }

  const mesAtual = todayISO().slice(0, 7);
  const gastoAtual = filterByMonth(entries, mesAtual).filter((e) => e.tipo === "saida");
  const gastoPorChave = new Map<string, number>();
  for (const e of gastoAtual) {
    const key = `${e.autor}|${e.categoria}`;
    gastoPorChave.set(key, (gastoPorChave.get(key) ?? 0) + Number(e.valor));
  }
  for (const limite of budgetLimits) {
    const gasto = gastoPorChave.get(`${limite.autor}|${limite.categoria}`) ?? 0;
    if (gasto > limite.limite_mensal) {
      alertas.push(
        `${limite.autor} já passou do orçamento de ${categoriaLabel("saida", limite.categoria)} este mês: ${formatBRL(gasto)} de ${formatBRL(limite.limite_mensal)}.`,
      );
    }
  }

  return alertas;
}

// Contas/entradas do checklist que vencem amanhã e ainda não foram
// confirmadas neste mês — usado só pelo resumo diário de push (ver
// src/app/api/cron/lembretes), não pelo chat. `statusDoMesDeAmanha` deve
// vir de fetchChecklistStatus pro mês de vencimento de amanhã (que pode ser
// o mês seguinte, se hoje for o último dia do mês).
export function computeLembretesDoDia(
  checklistItems: ChecklistItem[],
  statusDoMesDeAmanha: ChecklistStatus[],
): string[] {
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const diaAmanha = amanha.getDate();

  const concluidos = new Set(
    statusDoMesDeAmanha.filter((s) => s.concluido).map((s) => s.item_id),
  );

  const lembretes: string[] = [];
  for (const item of checklistItems) {
    if (item.dia_vencimento !== diaAmanha || concluidos.has(item.id)) continue;
    const acao = item.tipo === "a_receber" ? "a receber" : "a pagar";
    const valor = item.valor_esperado != null ? ` — ${formatBRL(item.valor_esperado)}` : "";
    lembretes.push(`"${item.nome}" (${acao}) vence amanhã${valor}.`);
  }
  return lembretes;
}
