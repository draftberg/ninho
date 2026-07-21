import { createClient } from "@/lib/supabase/server";
import { fetchChecklistItems, fetchChecklistStatus, fetchAllEntries, fetchCartoes } from "@/lib/data";
import { faturaQueVenceEm } from "@/lib/cartoes";
import { formatBRL, monthLabel } from "@/lib/format";
import { MonthNav } from "@/components/MonthNav";
import { ChecklistItemRow } from "./ChecklistItemRow";
import { CreateChecklistItemForm } from "./CreateChecklistItemForm";

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  const { mes: mesParam } = await searchParams;
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : currentMonthKey();

  const supabase = await createClient();
  const [items, status, allEntries, cartoes] = await Promise.all([
    fetchChecklistItems(supabase),
    fetchChecklistStatus(supabase, mes),
    fetchAllEntries(supabase),
    fetchCartoes(supabase),
  ]);

  const cartaoById = new Map(cartoes.map((c) => [c.id, c]));

  function valorDoItem(item: (typeof items)[number]): number {
    if (item.origem_cartao_id) {
      const cartao = cartaoById.get(item.origem_cartao_id);
      return cartao ? faturaQueVenceEm(allEntries, cartao, mes).total : 0;
    }
    return Number(item.valor_esperado ?? 0);
  }

  const statusByItem = new Map(status.map((s) => [s.item_id, s]));
  const concluidos = items.filter((i) => statusByItem.get(i.id)?.concluido).length;
  const valorTotal = items.reduce((sum, i) => sum + valorDoItem(i), 0);
  const valorConcluido = items
    .filter((i) => statusByItem.get(i.id)?.concluido)
    .reduce((sum, i) => sum + valorDoItem(i), 0);

  const receber = items.filter((i) => i.tipo === "a_receber");
  const pagar = items.filter((i) => i.tipo === "a_pagar");

  return (
    <div>
      <h2 className="section-title">Checklist mensal</h2>
      <MonthNav mes={mes} />

      <div className="checklist-summary card">
        <span>
          {concluidos} de {items.length} concluídos em {monthLabel(mes)}
        </span>
        {valorTotal > 0 && (
          <span className="mono">
            {formatBRL(valorConcluido)} de {formatBRL(valorTotal)}
          </span>
        )}
      </div>

      {items.length === 0 && (
        <p className="empty-state">Nenhum item no checklist ainda. Adicione abaixo.</p>
      )}

      {receber.length > 0 && (
        <>
          <div className="checklist-section-title">Entradas do mês</div>
          <div className="checklist-list">
            {receber.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                mes={mes}
                concluido={statusByItem.get(item.id)?.concluido ?? false}
                valorCalculado={item.origem_cartao_id ? valorDoItem(item) : null}
              />
            ))}
          </div>
        </>
      )}

      {pagar.length > 0 && (
        <>
          <div className="checklist-section-title">Contas e aportes</div>
          <div className="checklist-list">
            {pagar.map((item) => (
              <ChecklistItemRow
                key={item.id}
                item={item}
                mes={mes}
                concluido={statusByItem.get(item.id)?.concluido ?? false}
                valorCalculado={item.origem_cartao_id ? valorDoItem(item) : null}
              />
            ))}
          </div>
        </>
      )}

      <CreateChecklistItemForm />
    </div>
  );
}
