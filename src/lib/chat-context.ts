import type { SupabaseClient } from "@supabase/supabase-js";
import {
  fetchAllEntries,
  fetchBudgetLimits,
  fetchCartoes,
  fetchChecklistItems,
  fetchGoals,
  fetchProfiles,
} from "@/lib/data";
import { filterByMonth, porPessoa, sumByTipo } from "@/lib/aggregate";
import { faturaAberta, totalByCartao } from "@/lib/cartoes";
import { buildRollingCashFlow } from "@/lib/cashflow";
import { goalProjections } from "@/lib/projections";
import { computeAlertas } from "@/lib/chat-alerts";
import { formatBRL, formatDate, monthLabel, todayISO } from "@/lib/format";
import { categoriaLabel, salarioTotal, type Profile } from "@/lib/types";

function resumoSalario(p: Profile): string {
  const nome = p.nome ?? p.email;
  const total = salarioTotal(p);
  if (total <= 0) return `- ${nome}: sem salário cadastrado no Perfil`;
  if (p.tipo_salario === "quinzenal") {
    return `- ${nome}: quinzenal, ${formatBRL(p.salario_valor_1 ?? 0)} dia ${p.salario_dia_1} + ${formatBRL(p.salario_valor_2 ?? 0)} dia ${p.salario_dia_2}`;
  }
  return `- ${nome}: mensal, ${formatBRL(p.salario_valor_1 ?? 0)} dia ${p.salario_dia_1}`;
}

// Monta um briefing textual da situação financeira do casal, reaproveitando
// os mesmos cálculos já usados nas outras telas (metas, fluxo de caixa,
// cartões, orçamento). Usado como contexto (systemInstruction) do chat —
// montado sob demanda a cada mensagem, não guardado em lugar nenhum.
export async function buildFinanceContext(supabase: SupabaseClient): Promise<string> {
  const [entries, goals, checklistItems, profiles, cartoes, budgetLimits] = await Promise.all([
    fetchAllEntries(supabase),
    fetchGoals(supabase),
    fetchChecklistItems(supabase),
    fetchProfiles(supabase),
    fetchCartoes(supabase),
    fetchBudgetLimits(supabase),
  ]);

  const hoje = todayISO();
  const mesAtual = hoje.slice(0, 7);
  const doMes = filterByMonth(entries, mesAtual);
  const totalEntrada = sumByTipo(doMes, "entrada");
  const totalSaida = sumByTipo(doMes, "saida");
  const totalInvestimento = sumByTipo(doMes, "investimento");
  const pessoas = porPessoa(doMes);

  const projecoes = goalProjections(entries, goals);
  const cashFlow = buildRollingCashFlow(entries, checklistItems, profiles, 12);
  const ultimaColuna = cashFlow[cashFlow.length - 1];

  const alertas = computeAlertas(entries, goals, checklistItems, profiles, budgetLimits);

  const linhasMetas = projecoes.length
    ? projecoes
        .map((p) => {
          if (p.status === "sem_prazo") return `- ${p.goal.nome}: ${formatBRL(p.totalAtual)} guardado, sem meta/prazo definidos`;
          const statusLabel = p.status === "concluida" ? "concluída" : p.status === "atrasada" ? "ATRASADA" : "no ritmo";
          return `- ${p.goal.nome}: ${formatBRL(p.totalAtual)} de ${formatBRL(p.goal.valor_meta ?? 0)}, prazo ${p.goal.data_alvo}, ritmo ${formatBRL(p.ritmoMensal)}/mês (status: ${statusLabel})`;
        })
        .join("\n")
    : "- (nenhuma meta cadastrada)";

  const linhasCartoes = cartoes.length
    ? cartoes
        .map((c) => {
          const aberta = faturaAberta(entries, c);
          return `- ${c.nome}${c.banco ? ` (${c.banco})` : ""}: fatura aberta ${formatBRL(aberta.total)}, vence ${formatDate(aberta.vencimento)}, fecha dia ${c.dia_fechamento}${c.limite ? `, limite ${formatBRL(c.limite)}` : ""} — total histórico gasto: ${formatBRL(totalByCartao(entries, c.id))}`;
        })
        .join("\n")
    : "- (nenhum cartão cadastrado)";

  const linhasOrcamento = budgetLimits.length
    ? budgetLimits
        .map((b) => {
          const gasto = doMes
            .filter((e) => e.tipo === "saida" && e.autor === b.autor && e.categoria === b.categoria)
            .reduce((sum, e) => sum + Number(e.valor), 0);
          return `- ${b.autor} · ${categoriaLabel("saida", b.categoria)}: ${formatBRL(gasto)} de ${formatBRL(b.limite_mensal)}`;
        })
        .join("\n")
    : "- (nenhuma meta de gasto cadastrada)";

  return `Situação financeira atual do casal (Berg e Gabi) no app Ninho — dados reais, não invente valores além destes.

Data de hoje: ${formatDate(hoje)}

Salários cadastrados no Perfil:
${profiles.map(resumoSalario).join("\n") || "- (nenhum perfil cadastrado)"}

Resumo de ${monthLabel(mesAtual)}:
- Entradas: ${formatBRL(totalEntrada)}
- Saídas: ${formatBRL(totalSaida)}
- Investido/guardado: ${formatBRL(totalInvestimento)}
- Saldo do mês: ${formatBRL(totalEntrada - totalSaida - totalInvestimento)}
${pessoas.map((p) => `- ${p.autor}: entrada ${formatBRL(p.entrada)}, saída ${formatBRL(p.saida)}, investimento ${formatBRL(p.investimento)}`).join("\n")}

Metas de reserva e projeção:
${linhasMetas}

Saldo acumulado projetado nos próximos 12 meses: termina em ${formatBRL(ultimaColuna?.saldoAcumulado ?? 0)} (${ultimaColuna?.label ?? ""})

Cartões de crédito:
${linhasCartoes}

Metas de gasto por categoria (orçamento) — gasto do mês atual vs limite:
${linhasOrcamento}

Alertas automáticos detectados agora:
${alertas.length ? alertas.map((a) => `- ${a}`).join("\n") : "- (nenhum alerta no momento)"}`;
}
