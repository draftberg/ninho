import { createClient } from "@/lib/supabase/server";
import { fetchAllEntries, fetchBudgetLimits, fetchProfiles, fetchChecklistItems } from "@/lib/data";
import { filterByMonth } from "@/lib/aggregate";
import { buildCashFlow } from "@/lib/cashflow";
import { salarioTotal, type BudgetLimit } from "@/lib/types";
import { PERSON_DISPLAY_NAMES, personColorClass } from "@/lib/allowlist";
import { MonthNav } from "@/components/MonthNav";
import { BudgetLimitCard } from "./BudgetLimitCard";
import { CreateBudgetLimitForm } from "./CreateBudgetLimitForm";
import { BudgetSuggestionsPanel } from "./BudgetSuggestionsPanel";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function OrcamentoPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : currentMonthKey();

  const supabase = await createClient();
  const [allEntries, limits, profiles, checklistItems] = await Promise.all([
    fetchAllEntries(supabase),
    fetchBudgetLimits(supabase),
    fetchProfiles(supabase),
    fetchChecklistItems(supabase),
  ]);

  const gastosDoMes = filterByMonth(allEntries, mes).filter((e) => e.tipo === "saida");
  const gastoPorChave = new Map<string, number>();
  for (const e of gastosDoMes) {
    const key = `${e.autor}|${e.categoria}`;
    gastoPorChave.set(key, (gastoPorChave.get(key) ?? 0) + Number(e.valor));
  }

  const limitsByPerson = new Map<string, BudgetLimit[]>();
  for (const limit of limits) {
    const arr = limitsByPerson.get(limit.autor) ?? [];
    arr.push(limit);
    limitsByPerson.set(limit.autor, arr);
  }

  const salarioAtualizadoEm = profiles.reduce(
    (max, p) => (salarioTotal(p) > 0 && p.updated_at > max ? p.updated_at : max),
    "",
  );
  const limitesAtualizadosEm = limits.reduce((max, l) => (l.updated_at > max ? l.updated_at : max), "");
  const salarioDesatualizado = salarioAtualizadoEm !== "" && salarioAtualizadoEm > limitesAtualizadosEm;

  const anoAtual = String(new Date().getFullYear());
  const cashFlowAnoAtual = buildCashFlow(allEntries, checklistItems, profiles, anoAtual);
  const mesesComprometidos = cashFlowAnoAtual.filter((c) => c.saldoAcumulado < 0);
  const primeiroMesComprometido = mesesComprometidos[0] ?? null;

  return (
    <div>
      <h2 className="section-title">Orçamento</h2>
      <p className="entry-meta">
        Metas de gasto mensal por categoria e por pessoa — ajuda a não estourar o salário.
      </p>
      <MonthNav mes={mes} />

      {salarioDesatualizado && (
        <p className="form-message warn">
          O salário no Perfil foi atualizado depois da última vez que as metas de gasto foram salvas — gere
          uma sugestão nova pra manter tudo alinhado.
        </p>
      )}
      {mesesComprometidos.length > 0 && (
        <p className="form-message error">
          {mesesComprometidos.length} {mesesComprometidos.length === 1 ? "mês projetado" : "meses projetados"}{" "}
          com saldo negativo este ano{primeiroMesComprometido && `, o mais próximo é ${primeiroMesComprometido.label}`}
          . Vale reavaliar as metas abaixo.
        </p>
      )}

      <BudgetSuggestionsPanel />

      {PERSON_DISPLAY_NAMES.map((autor) => {
        const personLimits = limitsByPerson.get(autor) ?? [];
        return (
          <div key={autor} className="budget-person-section">
            <div className={`budget-person-header ${personColorClass(autor)}`}>{autor}</div>
            {personLimits.length === 0 ? (
              <p className="empty-state small">Nenhuma meta de gasto cadastrada ainda.</p>
            ) : (
              <div className="budget-grid">
                {personLimits.map((limit) => (
                  <BudgetLimitCard
                    key={limit.id}
                    limit={limit}
                    gasto={gastoPorChave.get(`${limit.autor}|${limit.categoria}`) ?? 0}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}

      <CreateBudgetLimitForm people={PERSON_DISPLAY_NAMES} />
    </div>
  );
}
