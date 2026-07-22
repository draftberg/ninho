"use client";

import { useState } from "react";
import { updateCartao } from "@/lib/actions";
import { BANDEIRAS, type Cartao } from "@/lib/types";
import { PERSON_DISPLAY_NAMES } from "@/lib/allowlist";
import { CartaoMockup } from "@/components/CartaoMockup";

export function EditCartaoForm({ cartao }: { cartao: Cartao }) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(cartao.nome);
  const [banco, setBanco] = useState(cartao.banco ?? "");
  const [bandeira, setBandeira] = useState(cartao.bandeira ?? BANDEIRAS[0]);
  const [pessoa, setPessoa] = useState(cartao.pessoa ?? PERSON_DISPLAY_NAMES[0]);

  if (!editing) {
    return (
      <button type="button" className="primary-button" onClick={() => setEditing(true)}>
        Editar cartão
      </button>
    );
  }

  return (
    <form
      className="goal-card-new-form cartao-form"
      action={async (formData) => {
        await updateCartao(formData);
        setEditing(false);
      }}
    >
      <input type="hidden" name="id" value={cartao.id} />
      <CartaoMockup nome={nome} banco={banco} bandeira={bandeira} />
      <label>
        Nome
        <input
          type="text"
          name="nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          required
          autoFocus
        />
      </label>
      <label>
        Banco (opcional)
        <input type="text" name="banco" value={banco} onChange={(e) => setBanco(e.target.value)} />
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
        <input type="number" name="limite" step="0.01" min="0" defaultValue={cartao.limite ?? ""} />
      </label>
      <label>
        Dia de fechamento
        <input
          type="number"
          name="dia_fechamento"
          min="1"
          max="31"
          defaultValue={cartao.dia_fechamento}
          required
        />
      </label>
      <label>
        Dia de vencimento
        <input
          type="number"
          name="dia_vencimento"
          min="1"
          max="31"
          defaultValue={cartao.dia_vencimento}
          required
        />
      </label>
      <div className="goal-card-new-actions">
        <button type="button" className="secondary-button" onClick={() => setEditing(false)}>
          Cancelar
        </button>
        <button type="submit" className="primary-button">
          Salvar
        </button>
      </div>
    </form>
  );
}
