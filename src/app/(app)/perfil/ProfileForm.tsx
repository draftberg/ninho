"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { upsertProfile, resetProfile } from "@/lib/actions";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import type { Profile, TipoSalario } from "@/lib/types";

export function ProfileForm({ email, profile }: { email: string; profile: Profile | null }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [savedComSalario, setSavedComSalario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tipoSalario, setTipoSalario] = useState<TipoSalario>(profile?.tipo_salario ?? "mensal");

  function handleSubmit(formData: FormData) {
    setSaved(false);
    setError(null);
    startTransition(async () => {
      try {
        await upsertProfile(formData);
        setSaved(true);
        setSavedComSalario(Number(formData.get("salario_valor_1")) > 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Não foi possível salvar o perfil.");
      }
    });
  }

  return (
    <form action={handleSubmit} className="entry-form profile-form">
      <div className="field">
        <label htmlFor="nome">Nome</label>
        <input id="nome" name="nome" type="text" defaultValue={profile?.nome ?? ""} required />
      </div>

      <div className="field">
        <label htmlFor="sobrenome">Sobrenome</label>
        <input
          id="sobrenome"
          name="sobrenome"
          type="text"
          defaultValue={profile?.sobrenome ?? ""}
        />
      </div>

      <div className="field">
        <label htmlFor="telefone">Telefone</label>
        <input
          id="telefone"
          name="telefone"
          type="tel"
          placeholder="(11) 91234-5678"
          defaultValue={profile?.telefone ?? ""}
        />
      </div>

      <div className="field">
        <label htmlFor="email">Email de login</label>
        <input id="email" type="email" value={email} disabled />
      </div>

      <div className="field">
        <label>Salário</label>
        <div className="subcategoria-grid">
          <button
            type="button"
            className={tipoSalario === "mensal" ? "active" : ""}
            onClick={() => setTipoSalario("mensal")}
          >
            Mensal
          </button>
          <button
            type="button"
            className={tipoSalario === "quinzenal" ? "active" : ""}
            onClick={() => setTipoSalario("quinzenal")}
          >
            Quinzenal
          </button>
        </div>
        <input type="hidden" name="tipo_salario" value={tipoSalario} />
      </div>

      <div className="salario-parcela">
        <div className="field">
          <label htmlFor="salario_valor_1">
            {tipoSalario === "quinzenal" ? "1ª parcela (R$)" : "Valor (R$)"}
          </label>
          <input
            id="salario_valor_1"
            name="salario_valor_1"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            className="valor-input"
            defaultValue={profile?.salario_valor_1 ?? ""}
          />
        </div>
        <div className="field">
          <label htmlFor="salario_dia_1">Dia</label>
          <input
            id="salario_dia_1"
            name="salario_dia_1"
            type="number"
            min="1"
            max="31"
            placeholder="Ex: 5"
            defaultValue={profile?.salario_dia_1 ?? ""}
          />
        </div>
      </div>

      {tipoSalario === "quinzenal" && (
        <div className="salario-parcela">
          <div className="field">
            <label htmlFor="salario_valor_2">2ª parcela (R$)</label>
            <input
              id="salario_valor_2"
              name="salario_valor_2"
              type="number"
              step="0.01"
              min="0"
              placeholder="0,00"
              className="valor-input"
              defaultValue={profile?.salario_valor_2 ?? ""}
            />
          </div>
          <div className="field">
            <label htmlFor="salario_dia_2">Dia</label>
            <input
              id="salario_dia_2"
              name="salario_dia_2"
              type="number"
              min="1"
              max="31"
              placeholder="Ex: 20"
              defaultValue={profile?.salario_dia_2 ?? ""}
            />
          </div>
        </div>
      )}

      <button type="submit" className="primary-button" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </button>
      {saved && !isPending && <p className="form-message success">Perfil salvo!</p>}
      {saved && !isPending && savedComSalario && (
        <p className="form-message warn">
          Salário atualizado — não esqueça de reavaliar suas{" "}
          <Link href="/orcamento">metas de gasto</Link>.
        </p>
      )}
      {error && <p className="form-message error">{error}</p>}

      <div className="profile-danger-zone">
        <ConfirmDeleteButton
          label="Resetar informações do perfil"
          title="Resetar perfil"
          description="Isso apaga nome, sobrenome, telefone e o planejamento de salário deste perfil, incluindo as entradas futuras ainda não confirmadas no checklist. Salários já confirmados continuam no Histórico normalmente."
          onConfirm={resetProfile}
          className="danger-outline-button"
        />
      </div>
    </form>
  );
}
