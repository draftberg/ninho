import { createClient } from "@/lib/supabase/server";
import { fetchAllEntries, fetchGoals } from "@/lib/data";
import { entriesByGoal, totalByGoal, porPessoa } from "@/lib/aggregate";
import { formatBRL, formatDate } from "@/lib/format";
import type { Entry, Goal } from "@/lib/types";
import { personColorClass } from "@/lib/allowlist";
import { NestIllustration } from "@/components/NestIllustration";
import { PersonAvatar } from "@/components/PersonAvatar";
import { ViewToggle, type Vista } from "@/components/ViewToggle";
import { PiggyBankIcon, CalendarCheckIcon, ShieldIcon } from "@phosphor-icons/react/dist/ssr";
import { EditGoalForm } from "./EditGoalForm";
import { CreateGoalForm } from "./CreateGoalForm";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { deleteGoal, criarReservaEmergencia } from "@/lib/actions";
import Link from "next/link";

export default async function ReservaPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; meta?: string }>;
}) {
  const { vista: vistaParam, meta: metaParam } = await searchParams;
  const vista: Vista = vistaParam === "pessoa" ? "pessoa" : "categoria";
  const supabase = await createClient();
  const [entries, goals] = await Promise.all([fetchAllEntries(supabase), fetchGoals(supabase)]);

  const selectedGoal =
    goals.find((g) => g.id === metaParam) ?? goals.find((g) => g.especial_bebe) ?? goals[0];
  const temReservaEmergencia = goals.some((g) => g.especial_emergencia);

  return (
    <div>
      <h2 className="section-title">Reserva</h2>

      <div className="goals-grid">
        {goals.map((goal) => {
          const total = totalByGoal(entries, goal.id);
          const meta = Number(goal.valor_meta ?? 0);
          const percentual = meta > 0 ? Math.round((total / meta) * 100) : null;
          const active = selectedGoal?.id === goal.id;
          return (
            <Link
              key={goal.id}
              href={`/reserva?meta=${goal.id}`}
              className={`goal-card${active ? " active" : ""}`}
            >
              <span className="goal-card-icon">
                {goal.especial_emergencia ? (
                  <ShieldIcon size={20} weight="fill" />
                ) : (
                  <PiggyBankIcon size={20} weight="fill" />
                )}
              </span>
              <span className="goal-card-name">{goal.nome}</span>
              <span className="goal-card-valor">{formatBRL(total)}</span>
              {percentual !== null && (
                <span className="goal-card-meta">
                  {percentual}% de {formatBRL(meta)}
                </span>
              )}
              {goal.data_alvo && (
                <span className="goal-card-data">
                  <CalendarCheckIcon size={13} /> {formatDate(goal.data_alvo)}
                </span>
              )}
            </Link>
          );
        })}
        <CreateGoalForm />
        {!temReservaEmergencia && (
          <form action={criarReservaEmergencia}>
            <button type="submit" className="goal-card goal-card-new">
              <ShieldIcon size={22} weight="bold" />
              <span>Criar reserva de emergência</span>
            </button>
          </form>
        )}
      </div>

      {goals.length === 0 && (
        <p className="empty-state">Nenhuma meta criada ainda. Crie a primeira acima.</p>
      )}

      {selectedGoal && (
        <GoalDetail
          goal={selectedGoal}
          entries={entriesByGoal(entries, selectedGoal.id)}
          vista={vista}
        />
      )}
    </div>
  );
}

function GoalDetail({ goal, entries, vista }: { goal: Goal; entries: Entry[]; vista: Vista }) {
  const total = entries.reduce((sum, e) => sum + Number(e.valor), 0);
  const meta = Number(goal.valor_meta ?? 0);
  const progresso = meta > 0 ? Math.min(total / meta, 1) : 0;
  const percentual = meta > 0 ? Math.round((total / meta) * 100) : 0;
  const contribuicoes = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
  const pessoas = porPessoa(entries);

  return (
    <div>
      <div className="nest-hero card">
        {goal.especial_bebe ? (
          <NestIllustration progress={progresso} size={200} />
        ) : goal.especial_emergencia ? (
          <ShieldIcon size={64} weight="duotone" />
        ) : (
          <PiggyBankIcon size={64} weight="duotone" />
        )}
        <h2>{goal.nome}</h2>
        <div className="kpi-value" style={{ color: "var(--color-gold)" }}>
          {formatBRL(total)}
          {meta > 0 && (
            <span style={{ fontSize: "0.9rem", color: "#6e7a76" }}> de {formatBRL(meta)}</span>
          )}
        </div>
        {meta > 0 && (
          <>
            <div className="progress-bar">
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(percentual, 100)}%` }}
              />
            </div>
            <p>{percentual}% da meta atingido</p>
          </>
        )}
        {goal.data_alvo && (
          <p className="entry-meta">Conclusão prevista: {formatDate(goal.data_alvo)}</p>
        )}
        <EditGoalForm goal={goal} />
        <ConfirmDeleteButton
          label="Excluir meta"
          title="Excluir meta"
          description={`Isso apaga a meta "${goal.nome}". As contribuições já registradas continuam no Histórico, mas deixam de contar para esta meta.`}
          onConfirm={deleteGoal.bind(null, goal.id)}
          className="danger-outline-button"
        />
      </div>

      {pessoas.length > 0 && (
        <div className="person-breakdown" style={{ marginTop: "1rem" }}>
          {pessoas.map((p) => (
            <div key={p.autor} className={`card person-card ${personColorClass(p.autor)}`}>
              <h3>{p.autor}</h3>
              <div className="person-row">
                <span>Contribuído</span>
                <span className="mono">{formatBRL(p.investimento)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="section-title" style={{ marginTop: "1.5rem" }}>
        Contribuições
      </div>
      <ViewToggle vista={vista} />
      {contribuicoes.length === 0 && (
        <p className="empty-state">Nenhuma contribuição registrada ainda.</p>
      )}
      <div className="entry-list">
        {contribuicoes.map((entry) => {
          const colorClass = vista === "pessoa" ? personColorClass(entry.autor) : "investimento";
          return (
            <div key={entry.id} className="entry-item">
              <div className="entry-row">
                <PersonAvatar autor={entry.autor} />
                <div className="entry-main">
                  <span className="entry-desc">{entry.descricao || "Contribuição"}</span>
                  <span className="entry-meta">
                    {formatDate(entry.date)} · {entry.autor}
                  </span>
                </div>
              </div>
              <span className={`entry-valor ${colorClass}`}>{formatBRL(entry.valor)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
