"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { listarConversas, carregarMensagens, deletarConversa } from "@/lib/chat";
import { formatDate } from "@/lib/format";
import type { ChatConversa } from "@/lib/types";
import {
  ChatCircleDotsIcon,
  XIcon,
  PaperPlaneRightIcon,
  ClockCounterClockwiseIcon,
  PlusIcon,
  TrashIcon,
  SparkleIcon,
} from "@phosphor-icons/react";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  local?: boolean;
}

function saudacaoProativa(alerts: string[]): string {
  if (alerts.length === 0) {
    return "Oi! Sou o assistente financeiro do Ninho. Pode perguntar qualquer coisa sobre como o app funciona, ou pedir uma opinião sobre as finanças de vocês.";
  }
  const lista = alerts.map((a) => `- ${a}`).join("\n");
  return `Oi! Antes de mais nada, notei uns pontos de atenção:\n\n${lista}\n\nQuer que eu detalhe algum desses, ou tem outra pergunta?`;
}

export function ChatWidget({ alerts }: { alerts: string[] }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "historico">("chat");
  const [conversas, setConversas] = useState<ChatConversa[] | null>(null);
  const [conversaId, setConversaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<DisplayMessage[]>(() => [
    { role: "assistant", content: saudacaoProativa(alerts), local: true },
  ]);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [mensagens, isPending]);

  function carregarConversas() {
    startTransition(async () => {
      try {
        const lista = await listarConversas();
        setConversas(lista);
      } catch (err) {
        console.error("[chat] falha ao listar conversas:", err);
        setConversas([]);
        setError("Não foi possível carregar o histórico agora.");
      }
    });
  }

  function handleOpen() {
    setOpen(true);
    if (conversas === null) carregarConversas();
  }

  function handleNovaConversa() {
    setConversaId(null);
    setMensagens([{ role: "assistant", content: saudacaoProativa(alerts), local: true }]);
    setError(null);
    setView("chat");
  }

  function handleAbrirConversa(id: string) {
    setConversaId(id);
    setError(null);
    setView("chat");
    startTransition(async () => {
      try {
        const historico = await carregarMensagens(id);
        setMensagens(historico.map((m) => ({ role: m.role, content: m.content })));
      } catch (err) {
        console.error("[chat] falha ao carregar mensagens:", err);
        setMensagens([]);
        setError("Não foi possível carregar essa conversa agora.");
      }
    });
  }

  function handleExcluirConversa(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Excluir esta conversa?")) return;
    startTransition(async () => {
      try {
        await deletarConversa(id);
        setConversas((prev) => prev?.filter((c) => c.id !== id) ?? null);
        if (conversaId === id) handleNovaConversa();
      } catch (err) {
        console.error("[chat] falha ao excluir conversa:", err);
        setError("Não foi possível excluir essa conversa agora.");
      }
    });
  }

  function handleSend() {
    const texto = input.trim();
    if (!texto || isPending) return;
    setInput("");
    setError(null);
    const isNova = !conversaId;
    setMensagens((prev) => [...prev, { role: "user", content: texto }, { role: "assistant", content: "" }]);

    startTransition(async () => {
      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversaId, texto }),
        });

        if (!response.ok || !response.body) {
          const mensagemErro = (await response.text()) || "Não foi possível responder agora.";
          setMensagens((prev) => prev.slice(0, -1));
          setError(mensagemErro);
          return;
        }

        const novaConversaId = response.headers.get("X-Conversa-Id");
        if (novaConversaId) {
          setConversaId(novaConversaId);
          if (isNova) {
            setConversas(null); // força recarregar a lista com a conversa nova na próxima abertura
          }
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          setMensagens((prev) => {
            const proximo = [...prev];
            const ultimo = proximo[proximo.length - 1];
            proximo[proximo.length - 1] = { ...ultimo, content: ultimo.content + chunk };
            return proximo;
          });
        }
      } catch (err) {
        console.error("[chat] falha ao enviar mensagem:", err);
        setMensagens((prev) => prev.slice(0, -1));
        setError("Não foi possível enviar a mensagem agora. Tente novamente em instantes.");
      }
    });
  }

  const conversasPorDia = new Map<string, ChatConversa[]>();
  for (const c of conversas ?? []) {
    const arr = conversasPorDia.get(c.dia) ?? [];
    arr.push(c);
    conversasPorDia.set(c.dia, arr);
  }

  return (
    <div className="chat-widget-root">
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span className="chat-panel-title">
              <SparkleIcon size={16} weight="fill" /> Assistente Ninho
            </span>
            <div className="chat-panel-actions">
              <button
                type="button"
                className="chat-icon-button"
                onClick={() => {
                  if (view === "chat") {
                    setView("historico");
                    if (conversas === null) carregarConversas();
                  } else {
                    setView("chat");
                  }
                }}
                aria-label="Ver conversas anteriores"
                title="Conversas anteriores"
              >
                <ClockCounterClockwiseIcon size={17} />
              </button>
              <button
                type="button"
                className="chat-icon-button"
                onClick={handleNovaConversa}
                aria-label="Nova conversa"
                title="Nova conversa"
              >
                <PlusIcon size={17} />
              </button>
              <button
                type="button"
                className="chat-icon-button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
              >
                <XIcon size={17} />
              </button>
            </div>
          </div>

          {view === "historico" ? (
            <div className="chat-historico">
              {conversas === null && <p className="empty-state small">Carregando...</p>}
              {conversas?.length === 0 && (
                <p className="empty-state small">Nenhuma conversa ainda.</p>
              )}
              {Array.from(conversasPorDia.entries()).map(([dia, items]) => (
                <div key={dia} className="chat-historico-dia">
                  <div className="chat-historico-dia-label">{formatDate(dia)}</div>
                  {items.map((c) => (
                    <div
                      key={c.id}
                      className="chat-historico-item"
                      role="button"
                      tabIndex={0}
                      onClick={() => handleAbrirConversa(c.id)}
                      onKeyDown={(e) => e.key === "Enter" && handleAbrirConversa(c.id)}
                    >
                      <span>{c.tema}</span>
                      <button
                        type="button"
                        className="chat-historico-delete"
                        onClick={(e) => handleExcluirConversa(c.id, e)}
                        aria-label="Excluir conversa"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="chat-messages" ref={scrollRef}>
                {mensagens.map((m, i) => {
                  const isPlaceholderVazio =
                    isPending && i === mensagens.length - 1 && m.role === "assistant" && !m.content;
                  return (
                    <div
                      key={i}
                      className={`chat-bubble ${m.role}${isPlaceholderVazio ? " chat-typing" : ""}`}
                    >
                      {isPlaceholderVazio ? (
                        <span className="chat-typing-dots">
                          <span />
                          <span />
                          <span />
                        </span>
                      ) : (
                        m.content
                      )}
                    </div>
                  );
                })}
                {error && <p className="form-message error">{error}</p>}
              </div>
              <form
                className="chat-input-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte alguma coisa..."
                  disabled={isPending}
                />
                <button type="submit" className="chat-send-button" disabled={isPending || !input.trim()}>
                  <PaperPlaneRightIcon size={18} weight="fill" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        className="chat-bubble-button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-label="Abrir assistente financeiro"
      >
        <ChatCircleDotsIcon size={26} weight="fill" />
        {!open && alerts.length > 0 && <span className="chat-bubble-badge" />}
      </button>
    </div>
  );
}
