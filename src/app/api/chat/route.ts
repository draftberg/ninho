import { GoogleGenAI } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { personNameFor } from "@/lib/allowlist";
import { buildFinanceContext } from "@/lib/chat-context";
import { fetchChatMensagens } from "@/lib/data";

// Runtime Edge: nas Vercel Functions em Node.js o corpo da resposta pode
// ficar retido em buffer e chegar ao cliente em poucos blocos grandes em vez
// de ir fluindo aos poucos — no Edge Runtime o streaming chega de fato
// incremental, que é o objetivo aqui.
export const runtime = "edge";

const FALLBACK = "Não foi possível responder agora. Tente novamente em instantes.";

function temaHeuristico(texto: string): string {
  const palavras = texto.trim().split(/\s+/).slice(0, 6).join(" ");
  if (!palavras) return "Nova conversa";
  return palavras.length > 60 ? `${palavras.slice(0, 57)}...` : palavras;
}

// Endpoint dedicado (em vez de Server Action) porque Server Actions não
// suportam resposta em streaming — aqui a resposta da IA vai sendo
// encaminhada pro cliente token a token conforme é gerada, em vez de
// esperar tudo pronto (o que antes fazia o chat parecer bem mais lento).
export async function POST(request: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return new Response("GEMINI_API_KEY não configurada no servidor.", { status: 500 });
  }

  let body: { conversaId: string | null; texto: string };
  try {
    body = await request.json();
  } catch {
    return new Response("Corpo da requisição inválido.", { status: 400 });
  }

  const mensagem = (body.texto ?? "").trim();
  if (!mensagem) {
    return new Response("Escreva uma mensagem antes de enviar.", { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response("Usuário não autenticado.", { status: 401 });
  }
  const autor = personNameFor(user.email);

  const novaConversa = !body.conversaId;
  let conversaId = body.conversaId;

  try {
    // busca o contexto financeiro em paralelo com a criação da conversa —
    // são operações independentes, não precisam esperar uma pela outra
    const contextoPromise = buildFinanceContext(supabase);

    if (!conversaId) {
      const { data, error } = await supabase
        .from("chat_conversas")
        .insert({ autor, tema: temaHeuristico(mensagem) })
        .select()
        .single();
      if (error) throw new Error(error.message);
      conversaId = data.id as string;
    }

    // histórico anterior (vazio se é conversa nova — não precisa nem consultar)
    // e o contexto financeiro, buscados em paralelo
    const [priorMensagens, contexto] = await Promise.all([
      novaConversa ? Promise.resolve([]) : fetchChatMensagens(supabase, conversaId),
      contextoPromise,
    ]);

    // não bloqueia o início do streaming — a mensagem já está em `mensagem`
    // pra montar o prompt; a gravação em si só precisa terminar antes da
    // resposta do assistente ser salva, lá no final
    const userMsgPromise = supabase
      .from("chat_mensagens")
      .insert({ conversa_id: conversaId, role: "user", content: mensagem });

    const systemInstruction = `Você é o assistente financeiro pessoal do app "Ninho", usado por um casal (Berg e Gabi) que espera um bebê e controla as finanças em conjunto. Você está conversando com ${autor}.

Seu papel:
1. Explicar como qualquer parte do app funciona quando perguntarem — o app tem: Painel (visão geral, gráficos, saldo futuro projetado), Lançar (registrar entradas/saídas/investimentos, com opção de marcar como recorrente e vincular a um cartão), Histórico (lista de lançamentos), Reserva (metas de investimento tipo reserva do bebê), Cartões (fatura por fechamento/vencimento), Checklist (contas fixas e entradas recorrentes a confirmar mês a mês), Orçamento (metas de gasto por categoria e pessoa, com sugestão de IA), Calendário (visão mensal de vencimentos) e Importar extrato (lê um PDF/CSV e categoriza automaticamente).
2. Dar conselhos financeiros práticos e ações preditivas baseadas SOMENTE nos dados reais fornecidos abaixo — nunca invente números.
3. Ser direto, acolhedor, sem jargão financeiro complicado. Respostas curtas (2 a 4 frases), a menos que peçam mais detalhe. Responda em texto corrido, sem markdown.

${contexto}`;

    const contents = [
      ...priorMensagens.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: [{ text: mensagem }] },
    ];

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

    const streamResult = await ai.models.generateContentStream({
      model,
      contents,
      config: { systemInstruction },
    });

    const encoder = new TextEncoder();
    const finalConversaId = conversaId;
    let fullText = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult) {
            const text = chunk.text ?? "";
            if (text) {
              fullText += text;
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (err) {
          console.error("[chat] falha durante o streaming:", err);
          if (!fullText) controller.enqueue(encoder.encode(FALLBACK));
        } finally {
          controller.close();

          const { error: userMsgError } = await userMsgPromise;
          if (userMsgError) console.error("[chat] falha ao salvar mensagem do usuário:", userMsgError);

          const respostaFinal = fullText || FALLBACK;
          const { error: assistantMsgError } = await supabase
            .from("chat_mensagens")
            .insert({ conversa_id: finalConversaId, role: "assistant", content: respostaFinal });
          if (assistantMsgError) console.error("[chat] falha ao salvar resposta:", assistantMsgError);

          const { error: updateError } = await supabase
            .from("chat_conversas")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", finalConversaId);
          if (updateError) console.error("[chat] falha ao atualizar conversa:", updateError);
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Conversa-Id": finalConversaId,
      },
    });
  } catch (err) {
    console.error("[chat] falha ao preparar resposta:", err);
    return new Response(FALLBACK, { status: 500 });
  }
}
