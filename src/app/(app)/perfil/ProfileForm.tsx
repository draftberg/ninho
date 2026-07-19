"use client";

import { useState, useTransition } from "react";
import { upsertProfile } from "@/lib/actions";
import type { Profile } from "@/lib/types";

export function ProfileForm({ email, profile }: { email: string; profile: Profile | null }) {
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      await upsertProfile(formData);
      setSaved(true);
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
        <label htmlFor="salario_base">Salário base (R$)</label>
        <input
          id="salario_base"
          name="salario_base"
          type="number"
          step="0.01"
          min="0"
          placeholder="0,00"
          className="valor-input"
          defaultValue={profile?.salario_base ?? ""}
        />
      </div>

      <div className="field">
        <label htmlFor="dia_recebimento">Dia de recebimento (opcional)</label>
        <input
          id="dia_recebimento"
          name="dia_recebimento"
          type="number"
          min="1"
          max="31"
          placeholder="Ex: 5"
          defaultValue={profile?.dia_recebimento ?? ""}
        />
      </div>

      <button type="submit" className="primary-button" disabled={isPending}>
        {isPending ? "Salvando..." : "Salvar"}
      </button>
      {saved && !isPending && <p className="form-message success">Perfil salvo!</p>}
    </form>
  );
}
