import { createClient } from "@/lib/supabase/server";
import { fetchAllEntries, fetchSettings } from "@/lib/data";
import { formatBRL, formatDate } from "@/lib/format";
import { NestIllustration } from "@/components/NestIllustration";
import { GoalForm } from "./GoalForm";

export default async function ReservaBebePage() {
  const supabase = await createClient();
  const [entries, settings] = await Promise.all([
    fetchAllEntries(supabase),
    fetchSettings(supabase),
  ]);

  const contribuicoes = entries
    .filter((e) => e.tipo === "investimento" && e.subcategoria === "nenem")
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  const total = contribuicoes.reduce((sum, e) => sum + Number(e.valor), 0);
  const meta = Number(settings.meta_bebe);
  const progresso = meta > 0 ? Math.min(total / meta, 1) : 0;
  const percentual = meta > 0 ? Math.round((total / meta) * 100) : 0;

  return (
    <div>
      <div className="nest-hero card">
        <NestIllustration progress={progresso} size={200} />
        <h2>Reserva do bebê</h2>
        <div className="kpi-value" style={{ color: "var(--color-gold)" }}>
          {formatBRL(total)} <span style={{ fontSize: "0.9rem", color: "#6e7a76" }}>de {formatBRL(meta)}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${Math.min(percentual, 100)}%` }} />
        </div>
        <p>{percentual}% da meta atingido</p>
        <GoalForm metaBebe={meta} />
      </div>

      <div className="section-title" style={{ marginTop: "1.5rem" }}>
        Contribuições
      </div>
      {contribuicoes.length === 0 && (
        <p className="empty-state">Nenhuma contribuição registrada ainda.</p>
      )}
      <div className="entry-list">
        {contribuicoes.map((entry) => (
          <div key={entry.id} className="entry-item">
            <div className="entry-main">
              <span className="entry-desc">{entry.descricao || "Contribuição"}</span>
              <span className="entry-meta">
                {formatDate(entry.date)} · {entry.autor}
              </span>
            </div>
            <span className="entry-valor investimento">{formatBRL(entry.valor)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
