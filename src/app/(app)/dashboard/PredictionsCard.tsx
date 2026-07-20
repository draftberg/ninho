"use client";

import { useState, useTransition } from "react";
import { generatePredictiveActions, type InsightsResult } from "@/lib/insights";
import { Modal } from "@/components/Modal";
import { formatBRL } from "@/lib/format";
import type { GoalProjection } from "@/lib/projections";
import { CompassIcon } from "@phosphor-icons/react";

const STATUS_LABEL: Record<GoalProjection["status"], string> = {
  concluida: "Concluída",
  atrasada: "Atrasada",
  no_ritmo: "No ritmo",
  sem_prazo: "Sem prazo",
};

export function PredictionsCard({
  projections,
  saldoProjetado,
  mesesNegativos,
  ano,
}: {
  projections: GoalProjection[];
  saldoProjetado: number;
  mesesNegativos: number;
  ano: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<InsightsResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function handleGenerate() {
    startTransition(async () => {
      const r = await generatePredictiveActions();
      setResult(r);
    });
  }

  return (
    <div className="insights-card predictions-card">
      <div className="insights-header">
        <span className="insights-title">
          <CompassIcon size={18} weight="fill" /> Projeção e metas
        </span>
        <button
          type="button"
          className={result ? "secondary-button" : "primary-button"}
          onClick={handleGenerate}
          disabled={isPending}
        >
          {isPending ? "Analisando..." : result ? "Atualizar" : "Gerar ações preditivas"}
        </button>
      </div>

      <div className="predictions-kpis">
        <div className="predictions-kpi">
          <span className="entry-meta">Saldo projetado em dez/{ano}</span>
          <span className={`mono ${saldoProjetado >= 0 ? "saldo-positivo" : "saldo-negativo"}`}>
            {formatBRL(saldoProjetado)}
          </span>
        </div>
        {mesesNegativos > 0 && (
          <p className="form-message error">
            {mesesNegativos} {mesesNegativos === 1 ? "mês projetado" : "meses projetados"} com saldo negativo
            este ano.
          </p>
        )}
      </div>

      {projections.length === 0 ? (
        <p className="empty-state small">Nenhuma meta com valor e prazo definidos ainda.</p>
      ) : (
        <div className="goal-projection-list">
          {projections.map((p) => (
            <div key={p.goal.id} className={`goal-projection-row ${p.status}`}>
              <span className="goal-projection-nome">{p.goal.nome}</span>
              <span className="entry-meta">
                ritmo {formatBRL(p.ritmoMensal)}/mês · precisa {formatBRL(p.valorNecessarioPorMes ?? 0)}/mês
              </span>
              <span className={`goal-projection-status ${p.status}`}>{STATUS_LABEL[p.status]}</span>
            </div>
          ))}
        </div>
      )}

      {result?.error && <p className="form-message error">{result.error}</p>}

      {result?.bullets && result.bullets.length > 0 && (
        <ul className="insights-bullets">
          {result.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}

      {result?.analysis && (
        <button type="button" className="insights-more" onClick={() => setModalOpen(true)}>
          Ver análise completa
        </button>
      )}

      {modalOpen && result?.analysis && (
        <Modal title="Ações preditivas" onClose={() => setModalOpen(false)}>
          {result.analysis.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </Modal>
      )}
    </div>
  );
}
