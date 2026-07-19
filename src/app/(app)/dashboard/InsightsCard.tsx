"use client";

import { useState, useTransition } from "react";
import { generateInsights, type InsightsResult } from "@/lib/insights";
import { Modal } from "@/components/Modal";
import { SparkleIcon } from "@phosphor-icons/react";

export function InsightsCard({ mes }: { mes: string }) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<InsightsResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  function handleGenerate() {
    startTransition(async () => {
      const r = await generateInsights(mes);
      setResult(r);
    });
  }

  return (
    <div className="insights-card">
      <div className="insights-header">
        <span className="insights-title">
          <SparkleIcon size={18} weight="fill" /> Insights da IA
        </span>
        <button
          type="button"
          className={result ? "secondary-button" : "primary-button"}
          onClick={handleGenerate}
          disabled={isPending}
        >
          {isPending ? "Analisando..." : result ? "Atualizar" : "Gerar análise"}
        </button>
      </div>

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
        <Modal title="Análise completa" onClose={() => setModalOpen(false)}>
          {result.analysis.split("\n\n").map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </Modal>
      )}
    </div>
  );
}
