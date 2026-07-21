import type { ChecklistStatus } from "@/lib/types";

// Quantas parcelas de um financiamento já foram confirmadas — conta os
// registros concluídos em checklist_status pro item do checklist ligado a
// esse financiamento (origem_financiamento_id), em qualquer mês.
export function parcelasPagas(statusConcluido: ChecklistStatus[], checklistItemId: string): number {
  return statusConcluido.filter((s) => s.item_id === checklistItemId).length;
}
