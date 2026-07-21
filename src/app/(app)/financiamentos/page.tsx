import { createClient } from "@/lib/supabase/server";
import { fetchFinanciamentos, fetchAllChecklistItems, fetchChecklistStatusConcluido } from "@/lib/data";
import { parcelasPagas } from "@/lib/financiamentos";
import { formatBRL } from "@/lib/format";
import { categoriaLabel, subcategoriaLabel, type Financiamento } from "@/lib/types";
import { HandCoinsIcon } from "@phosphor-icons/react/dist/ssr";
import { EditFinanciamentoForm } from "./EditFinanciamentoForm";
import { CreateFinanciamentoForm } from "./CreateFinanciamentoForm";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { deleteFinanciamento } from "@/lib/actions";
import Link from "next/link";

export default async function FinanciamentosPage({
  searchParams,
}: {
  searchParams: Promise<{ financiamento?: string }>;
}) {
  const { financiamento: financiamentoParam } = await searchParams;
  const supabase = await createClient();
  const [financiamentos, checklistItems, statusConcluido] = await Promise.all([
    fetchFinanciamentos(supabase),
    fetchAllChecklistItems(supabase),
    fetchChecklistStatusConcluido(supabase),
  ]);

  const selectedFinanciamento = financiamentos.find((f) => f.id === financiamentoParam) ?? financiamentos[0];

  function parcelasDe(financiamentoId: string): { pagas: number; item: (typeof checklistItems)[number] | undefined } {
    const item = checklistItems.find((i) => i.origem_financiamento_id === financiamentoId);
    return { pagas: item ? parcelasPagas(statusConcluido, item.id) : 0, item };
  }

  return (
    <div>
      <h2 className="section-title">Financiamentos</h2>

      <div className="goals-grid">
        {financiamentos.map((financiamento) => {
          const { pagas } = parcelasDe(financiamento.id);
          const percentual = Math.min(Math.round((pagas / financiamento.numero_parcelas) * 100), 100);
          const active = selectedFinanciamento?.id === financiamento.id;
          return (
            <Link
              key={financiamento.id}
              href={`/financiamentos?financiamento=${financiamento.id}`}
              className={`goal-card${active ? " active" : ""}`}
            >
              <span className="goal-card-icon">
                <HandCoinsIcon size={20} weight="fill" />
              </span>
              <span className="goal-card-name">{financiamento.nome}</span>
              <span className="goal-card-valor">{formatBRL(financiamento.valor_parcela)}/mês</span>
              <span className="goal-card-meta">
                {pagas} de {financiamento.numero_parcelas} parcelas · {percentual}%
              </span>
            </Link>
          );
        })}
        <CreateFinanciamentoForm />
      </div>

      {financiamentos.length === 0 && (
        <p className="empty-state">Nenhum financiamento cadastrado ainda. Crie o primeiro acima.</p>
      )}

      {selectedFinanciamento && (
        <FinanciamentoDetail
          financiamento={selectedFinanciamento}
          pagas={parcelasDe(selectedFinanciamento.id).pagas}
        />
      )}
    </div>
  );
}

function FinanciamentoDetail({
  financiamento,
  pagas,
}: {
  financiamento: Financiamento;
  pagas: number;
}) {
  const percentual = Math.min(Math.round((pagas / financiamento.numero_parcelas) * 100), 100);
  const quitado = pagas >= financiamento.numero_parcelas;

  return (
    <div>
      <div className="nest-hero card">
        <HandCoinsIcon size={64} weight="duotone" />
        <h2>{financiamento.nome}</h2>
        <div className="kpi-value" style={{ color: "var(--color-gold)" }}>
          {formatBRL(financiamento.valor_parcela)}
          <span style={{ fontSize: "0.9rem", color: "#6e7a76" }}> / mês</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${percentual}%` }} />
        </div>
        <p>
          {quitado
            ? "Quitado — todas as parcelas confirmadas"
            : `${pagas} de ${financiamento.numero_parcelas} parcelas pagas (${percentual}%)`}
        </p>
        <p className="entry-meta">
          Vence dia {financiamento.dia_vencimento} · {categoriaLabel("saida", financiamento.categoria)} ·{" "}
          {subcategoriaLabel("saida", financiamento.categoria, financiamento.subcategoria)}
        </p>
        <EditFinanciamentoForm financiamento={financiamento} />
        <ConfirmDeleteButton
          label="Excluir financiamento"
          title="Excluir financiamento"
          description={`Isso apaga o financiamento "${financiamento.nome}" e o lembrete de parcela no checklist. As parcelas já pagas continuam no Histórico.`}
          onConfirm={deleteFinanciamento.bind(null, financiamento.id)}
          className="danger-outline-button"
        />
      </div>
    </div>
  );
}
