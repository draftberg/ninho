"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { listarConversas, carregarMensagens, deletarConversa, confirmarLancamentoChat } from "@/lib/chat";
import { LANCAMENTO_SENTINEL, type LancamentoProposto } from "@/lib/chat-shared";
import { formatBRL, formatDate } from "@/lib/format";
import { categoriaLabel, subcategoriaLabel, TIPO_LABELS, type ChatConversa } from "@/lib/types";
import {
  ChatCircleDotsIcon,
  XIcon,
  PaperPlaneRightIcon,
  ClockCounterClockwiseIcon,
  PlusIcon,
  TrashIcon,
  SparkleIcon,
  CheckIcon,
  PaperclipIcon,
} from "@phosphor-icons/react";

type PropostaStatus = "pendente" | "confirmando" | "confirmado" | "cancelado";

interface DisplayMessage {
  role: "user" | "assistant";
  content: string;
  local?: boolean;
  propostas?: LancamentoProposto[];
  propostaStatus?: PropostaStatus[];
}

const TIPOS_ANEXO_ACEITOS = ["image/jpeg", "image/png", "application/pdf"];
const TAMANHO_MAXIMO_ANEXO = 8 * 1024 * 1024; // 8MB antes de comprimir (fotos são reduzidas depois)

// Reduz uma foto pro maior lado caber em ~1600px antes de enviar — evita
// estourar o limite de corpo de requisição da função serverless e deixa o
// upload mais rápido, sem perder legibilidade do documento.
async function redimensionarImagem(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const maiorLado = Math.max(bitmap.width, bitmap.height);
  const escala = Math.min(1, 1600 / maiorLado);
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, largura, altura);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.82));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
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
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleArquivoSelecionado(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // permite selecionar o mesmo arquivo de novo depois
    if (!file) return;
    setError(null);

    if (!TIPOS_ANEXO_ACEITOS.includes(file.type)) {
      setError("Anexe uma imagem (JPEG/PNG) ou um PDF.");
      return;
    }
    if (file.size > TAMANHO_MAXIMO_ANEXO) {
      setError("Arquivo muito grande — o limite é 8MB.");
      return;
    }

    if (file.type === "application/pdf") {
      setArquivo(file);
      return;
    }
    try {
      setArquivo(await redimensionarImagem(file));
    } catch (err) {
      console.error("[chat] falha ao redimensionar imagem:", err);
      setArquivo(file);
    }
  }

  function handleSend() {
    const texto = input.trim();
    const arquivoAtual = arquivo;
    if ((!texto && !arquivoAtual) || isPending) return;
    setInput("");
    setArquivo(null);
    setError(null);
    const isNova = !conversaId;
    const conteudoUsuario = arquivoAtual ? [texto, `📎 ${arquivoAtual.name}`].filter(Boolean).join("\n") : texto;
    setMensagens((prev) => [
      ...prev,
      { role: "user", content: conteudoUsuario },
      { role: "assistant", content: "" },
    ]);

    startTransition(async () => {
      try {
        let response: Response;
        if (arquivoAtual) {
          const formData = new FormData();
          if (conversaId) formData.set("conversaId", conversaId);
          formData.set("texto", texto);
          formData.set("file", arquivoAtual);
          response = await fetch("/api/chat", { method: "POST", body: formData });
        } else {
          response = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ conversaId, texto }),
          });
        }

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
        let bruto = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          if (!chunk) continue;
          bruto += chunk;
          const indiceSentinel = bruto.indexOf(LANCAMENTO_SENTINEL);
          const textoVisivel = indiceSentinel >= 0 ? bruto.slice(0, indiceSentinel) : bruto;
          setMensagens((prev) => {
            const proximo = [...prev];
            const ultimo = proximo[proximo.length - 1];
            proximo[proximo.length - 1] = { ...ultimo, content: textoVisivel };
            return proximo;
          });
        }

        const indiceSentinel = bruto.indexOf(LANCAMENTO_SENTINEL);
        if (indiceSentinel >= 0) {
          try {
            const propostas = JSON.parse(
              bruto.slice(indiceSentinel + LANCAMENTO_SENTINEL.length),
            ) as LancamentoProposto[];
            setMensagens((prev) => {
              const proximo = [...prev];
              const ultimo = proximo[proximo.length - 1];
              proximo[proximo.length - 1] = {
                ...ultimo,
                propostas,
                propostaStatus: propostas.map(() => "pendente" as PropostaStatus),
              };
              return proximo;
            });
          } catch (err) {
            console.error("[chat] falha ao interpretar propostas de lançamento:", err);
          }
        }
      } catch (err) {
        console.error("[chat] falha ao enviar mensagem:", err);
        setMensagens((prev) => prev.slice(0, -1));
        setError("Não foi possível enviar a mensagem agora. Tente novamente em instantes.");
      }
    });
  }

  function atualizarStatusProposta(messageIndex: number, itemIndex: number, status: PropostaStatus) {
    setMensagens((prev) => {
      const proximo = [...prev];
      const atual = proximo[messageIndex];
      const novoStatus = [...(atual.propostaStatus ?? [])];
      novoStatus[itemIndex] = status;
      proximo[messageIndex] = { ...atual, propostaStatus: novoStatus };
      return proximo;
    });
  }

  function handleConfirmarProposta(messageIndex: number, itemIndex: number) {
    const proposta = mensagens[messageIndex]?.propostas?.[itemIndex];
    if (!proposta) return;
    atualizarStatusProposta(messageIndex, itemIndex, "confirmando");
    startTransition(async () => {
      try {
        const result = await confirmarLancamentoChat(proposta);
        atualizarStatusProposta(messageIndex, itemIndex, result.error ? "pendente" : "confirmado");
        if (result.error) setError(result.error);
      } catch (err) {
        console.error("[chat] falha ao confirmar lançamento:", err);
        atualizarStatusProposta(messageIndex, itemIndex, "pendente");
        setError("Não foi possível salvar o lançamento agora. Tente novamente.");
      }
    });
  }

  function handleCancelarProposta(messageIndex: number, itemIndex: number) {
    atualizarStatusProposta(messageIndex, itemIndex, "cancelado");
  }

  function handleConfirmarTodos(messageIndex: number) {
    const status = mensagens[messageIndex]?.propostaStatus ?? [];
    status.forEach((s, itemIndex) => {
      if (s === "pendente") handleConfirmarProposta(messageIndex, itemIndex);
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
                    isPending &&
                    i === mensagens.length - 1 &&
                    m.role === "assistant" &&
                    !m.content &&
                    !m.propostas;
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
                        <>
                          {m.content}
                          {m.propostas && m.propostas.length > 0 && (
                            <div className="chat-proposta-list">
                              {m.propostas.length > 1 &&
                                m.propostaStatus?.some((s) => s === "pendente") && (
                                  <button
                                    type="button"
                                    className="chat-proposta-confirm-all"
                                    onClick={() => handleConfirmarTodos(i)}
                                  >
                                    <CheckIcon size={14} weight="bold" /> Confirmar todos
                                  </button>
                                )}
                              {m.propostas.map((proposta, j) => {
                                const status = m.propostaStatus?.[j] ?? "pendente";
                                return (
                                  <div className="chat-proposta-card" key={j}>
                                    <div className="chat-proposta-header">
                                      <span className={`chat-proposta-tipo ${proposta.tipo}`}>
                                        {TIPO_LABELS[proposta.tipo]}
                                      </span>
                                      <span className="chat-proposta-valor">{formatBRL(proposta.valor)}</span>
                                    </div>
                                    <div className="chat-proposta-detalhe">
                                      {categoriaLabel(proposta.tipo, proposta.categoria)} ·{" "}
                                      {subcategoriaLabel(proposta.tipo, proposta.categoria, proposta.subcategoria)}
                                    </div>
                                    <div className="chat-proposta-detalhe">
                                      {formatDate(proposta.date)}
                                      {proposta.descricao ? ` · ${proposta.descricao}` : ""}
                                    </div>
                                    {(status === "pendente" || status === "confirmando") && (
                                      <div className="chat-proposta-actions">
                                        <button
                                          type="button"
                                          className="chat-proposta-confirm"
                                          disabled={status === "confirmando"}
                                          onClick={() => handleConfirmarProposta(i, j)}
                                        >
                                          <CheckIcon size={14} weight="bold" /> Confirmar
                                        </button>
                                        <button
                                          type="button"
                                          className="chat-proposta-cancel"
                                          disabled={status === "confirmando"}
                                          onClick={() => handleCancelarProposta(i, j)}
                                        >
                                          Cancelar
                                        </button>
                                      </div>
                                    )}
                                    {status === "confirmado" && (
                                      <p className="chat-proposta-status ok">Lançamento salvo.</p>
                                    )}
                                    {status === "cancelado" && (
                                      <p className="chat-proposta-status">Descartado.</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })}
                {error && <p className="form-message error">{error}</p>}
              </div>
              {arquivo && (
                <div className="chat-attachment-chip">
                  <PaperclipIcon size={14} />
                  <span>{arquivo.name}</span>
                  <button type="button" onClick={() => setArquivo(null)} aria-label="Remover anexo">
                    <XIcon size={12} weight="bold" />
                  </button>
                </div>
              )}
              <form
                className="chat-input-row"
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleArquivoSelecionado}
                  hidden
                />
                <button
                  type="button"
                  className="chat-attach-button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isPending}
                  aria-label="Anexar foto ou PDF"
                  title="Anexar foto ou PDF (comprovante, nota, extrato)"
                >
                  <PaperclipIcon size={18} />
                </button>
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Pergunte alguma coisa..."
                  disabled={isPending}
                />
                <button
                  type="submit"
                  className="chat-send-button"
                  disabled={isPending || (!input.trim() && !arquivo)}
                >
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
