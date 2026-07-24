"use client";

import { useState, useTransition } from "react";
import {
  convidarParaConectar,
  aceitarConexao,
  recusarConexao,
  desconectar,
} from "@/lib/conexoes";
import { personNameFor, personColorClass, ALLOWED_EMAILS } from "@/lib/allowlist";
import type { Conexao } from "@/lib/types";
import { LinkIcon, LinkBreakIcon, CheckIcon, XIcon } from "@phosphor-icons/react";

export function ConexaoCard({ email, conexao }: { email: string; conexao: Conexao | null }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const me = email.toLowerCase();
  // App privado de 2 pessoas: o "outro" é o único outro e-mail com acesso.
  const outroEmailPadrao = ALLOWED_EMAILS.find((e) => e !== me) ?? "";

  function run(fn: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      try {
        const result = await fn();
        if (result?.error) setError(result.error);
      } catch (err) {
        console.error("[conexao] falha:", err);
        setError("Não foi possível concluir agora. Tente novamente.");
      }
    });
  }

  const conectado = conexao?.status === "aceita";
  const semConexao = !conexao || conexao.status === "desconectada";
  const pendente = conexao?.status === "pendente";
  const souSolicitante = conexao?.solicitante_email.toLowerCase() === me;
  const outroEmail = conexao
    ? souSolicitante
      ? conexao.convidado_email
      : conexao.solicitante_email
    : outroEmailPadrao;
  const outroNome = personNameFor(outroEmail);

  return (
    <div className="card conexao-card">
      <div className="conexao-card-header">
        <LinkIcon size={18} weight="bold" />
        <h3>Conexão</h3>
      </div>

      {conectado && (
        <>
          <p className="conexao-status">
            Conectado com{" "}
            <span className={personColorClass(outroNome)}>{outroNome}</span> — as informações de
            vocês se cruzam num painel só.
          </p>
          <button
            type="button"
            className="danger-outline-button"
            disabled={isPending}
            onClick={() => {
              if (!conexao) return;
              if (!confirm(`Desconectar de ${outroNome}?`)) return;
              run(() => desconectar(conexao.id));
            }}
          >
            <LinkBreakIcon size={16} /> Desconectar
          </button>
        </>
      )}

      {pendente && souSolicitante && (
        <p className="conexao-status">
          Convite enviado para <span className={personColorClass(outroNome)}>{outroNome}</span> —
          aguardando aceite.
        </p>
      )}

      {pendente && !souSolicitante && conexao && (
        <>
          <p className="conexao-status">
            <span className={personColorClass(outroNome)}>{outroNome}</span> quer se conectar e
            cruzar as informações com você.
          </p>
          <div className="conexao-actions">
            <button
              type="button"
              className="primary-button"
              disabled={isPending}
              onClick={() => run(() => aceitarConexao(conexao.id))}
            >
              <CheckIcon size={16} weight="bold" /> Aceitar
            </button>
            <button
              type="button"
              className="secondary-button"
              disabled={isPending}
              onClick={() => run(() => recusarConexao(conexao.id))}
            >
              <XIcon size={16} weight="bold" /> Recusar
            </button>
          </div>
        </>
      )}

      {semConexao && (
        <>
          <p className="conexao-status">
            Você ainda não está conectado
            {outroNome ? (
              <>
                {" "}
                com <span className={personColorClass(outroNome)}>{outroNome}</span>
              </>
            ) : null}
            . Ao conectar, as informações de vocês se cruzam num painel único.
          </p>
          {outroEmailPadrao && (
            <button
              type="button"
              className="primary-button"
              disabled={isPending}
              onClick={() => run(() => convidarParaConectar(outroEmailPadrao))}
            >
              <LinkIcon size={16} weight="bold" /> Convidar {personNameFor(outroEmailPadrao)}
            </button>
          )}
        </>
      )}

      {error && <p className="form-message error">{error}</p>}
    </div>
  );
}
