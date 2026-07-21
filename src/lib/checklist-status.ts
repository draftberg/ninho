export type ChecklistTone = "atrasado" | "breve" | "em-dia";

// Estado visual de um item do checklist: vermelho (atrasado), amarelo
// (vence em até 5 dias) ou verde (já confirmado, ou ainda com folga).
export function checklistTone(
  diaVencimento: number | null,
  mes: string,
  concluido: boolean,
): ChecklistTone {
  if (concluido || diaVencimento == null) return "em-dia";

  const hoje = new Date();
  const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  if (mes < mesAtual) return "atrasado";
  if (mes > mesAtual) return "em-dia";

  const diasRestantes = diaVencimento - hoje.getDate();
  if (diasRestantes < 0) return "atrasado";
  if (diasRestantes <= 5) return "breve";
  return "em-dia";
}
