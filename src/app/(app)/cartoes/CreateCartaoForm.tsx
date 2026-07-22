"use client";

import { useState } from "react";
import { createCartao } from "@/lib/actions";
import { BANDEIRAS } from "@/lib/types";
import { PERSON_DISPLAY_NAMES } from "@/lib/allowlist";
import { CartaoMockup } from "@/components/CartaoMockup";
import { PlusIcon } from "@phosphor-icons/react";

export function CreateCartaoForm() {
  const [open, setOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [banco, setBanco] = useState("");
  const [bandeira, setBandeira] = useState<string>(BANDEIRAS[0]);
  const [pessoa, setPessoa] = useState<string>(PERSON_DISPLAY_NAMES[0]);

  if (!open) {
    return (
      <button type="button" className="goal-card goal-card-new" onClick={() => setOpen(true)}>
        <PlusIcon size={22} weight="bold" />
        <span>Criar cartão</span>
      </button>
    );
  }

  return (
    <form
      className="goal-card goal-card-new-form cartao-form"
      action={async (formData) => {
        await createCartao(formData);
        setOpen(false);
        setNome("");
        setBanco("");
        setBandeira(BANDEIRAS[0]);
        setPessoa(PERSON_DISPLAY_NAMES[0]);
      }}
    >
      <CartaoMockup nome={nome} banco={banco} bandeira={bandeira} />
      <label>
        Nome
        <input
          type="text"
          name="nome"
          placeholder="Ex: Nubank, Inter"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          autoFocus
        />
      </label>
      <label>
        Banco (opcional)
        <input
          type="text"
          name="banco"
          placeholder="Ex: Nubank"
          value={banco}
          onChange={(e) => setBanco(e.target.value)}
        />
      </label>
      <label>
        Bandeira
        <select name="bandeira" value={bandeira} onChange={(e) => setBandeira(e.target.value)}>
          {BANDEIRAS.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </label>
      <label>
        Dono
        <select name="pessoa" value={pessoa} onChange={(e) => setPessoa(e.target.value)}>
          {PERSON_DISPLAY_NAMES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </label>
      <label>
        Limite (opcional)
        <input type="number" name="limite" step="0.01" min="0" placeholder="0,00" />
      </label>
      <label>
        Dia de fechamento
        <input type="number" name="dia_fechamento" min="1" max="31" placeholder="Ex: 25" required />
      </label>
      <label>
        Dia de vencimento
        <input type="number" name="dia_vencimento" min="1" max="31" placeholder="Ex: 5" required />
      </label>
      <div className="goal-card-new-actions">
        <button type="button" className="secondary-button" onClick={() => setOpen(false)}>
          Cancelar
        </button>
        <button type="submit" className="primary-button">
          Criar
        </button>
      </div>
    </form>
  );
}
