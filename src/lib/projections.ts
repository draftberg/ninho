import { entriesByGoal, totalByGoal } from "@/lib/aggregate";
import { monthKeyOf, todayISO } from "@/lib/format";
import type { Entry, Goal } from "@/lib/types";

export type GoalProjectionStatus = "concluida" | "sem_prazo" | "no_ritmo" | "atrasada";

export interface GoalProjection {
  goal: Goal;
  totalAtual: number;
  ritmoMensal: number;
  mesesRestantes: number | null;
  valorFaltante: number;
  valorNecessarioPorMes: number | null;
  status: GoalProjectionStatus;
}

function last3MonthKeys(): string[] {
  const now = new Date();
  return Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function mesesEntre(hojeISO: string, alvoISO: string): number {
  const [ay, am] = hojeISO.slice(0, 7).split("-").map(Number);
  const [by, bm] = alvoISO.slice(0, 7).split("-").map(Number);
  return (by - ay) * 12 + (bm - am);
}

// Ritmo médio mensal de aporte de uma meta = total contribuído nos últimos
// 3 meses (ou desde o início da meta, se mais recente) dividido pelo número
// de meses considerados.
function ritmoMensal(entries: Entry[], goal: Goal): number {
  const keys = last3MonthKeys();
  const inicioKey = goal.data_inicio?.slice(0, 7);
  const keysValidas = inicioKey ? keys.filter((k) => k >= inicioKey) : keys;
  if (keysValidas.length === 0) return 0;

  const contribuicoes = entriesByGoal(entries, goal.id).filter((e) =>
    keysValidas.includes(monthKeyOf(e.date)),
  );
  const total = contribuicoes.reduce((sum, e) => sum + Number(e.valor), 0);
  return total / keysValidas.length;
}

// Projeta, pra cada meta com valor e prazo definidos, se o ritmo atual de
// aportes é suficiente pra bater a meta na data alvo — cálculo puro, sem IA,
// usado tanto pra exibir KPIs quanto como contexto pra IA sugerir ações.
export function goalProjections(entries: Entry[], goals: Goal[]): GoalProjection[] {
  const hoje = todayISO();

  return goals.map((goal) => {
    const totalAtual = totalByGoal(entries, goal.id);
    const ritmo = ritmoMensal(entries, goal);
    const meta = Number(goal.valor_meta ?? 0);
    const valorFaltante = Math.max(meta - totalAtual, 0);

    if (meta <= 0 || !goal.data_alvo) {
      return {
        goal,
        totalAtual,
        ritmoMensal: ritmo,
        mesesRestantes: null,
        valorFaltante,
        valorNecessarioPorMes: null,
        status: "sem_prazo",
      };
    }

    if (valorFaltante <= 0) {
      return {
        goal,
        totalAtual,
        ritmoMensal: ritmo,
        mesesRestantes: 0,
        valorFaltante: 0,
        valorNecessarioPorMes: 0,
        status: "concluida",
      };
    }

    const mesesRestantes = Math.max(mesesEntre(hoje, goal.data_alvo), 1);
    const valorNecessarioPorMes = valorFaltante / mesesRestantes;
    const status: GoalProjectionStatus = ritmo >= valorNecessarioPorMes ? "no_ritmo" : "atrasada";

    return { goal, totalAtual, ritmoMensal: ritmo, mesesRestantes, valorFaltante, valorNecessarioPorMes, status };
  });
}
