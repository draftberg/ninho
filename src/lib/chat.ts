"use server";

import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { personNameFor } from "@/lib/allowlist";
import { buildFinanceContext } from "@/lib/chat-context";
import { fetchChatConversas, fetchChatMensagens } from "@/lib/data";
import type { ChatConversa, ChatMensagem } from "@/lib/types";

async function currentAuthor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, autor: personNameFor(user?.email) };
}

export async function listarConversas(): Promise<ChatConversa[]> {
  const { supabase } = await currentAuthor();
  return fetchChatConversas(supabase);
}

export async function carregarMensagens(conversaId: string): Promise<ChatMensagem[]> {
  const { supabase } = await currentAuthor();
  return fetchChatMensagens(supabase, conversaId);
}

export async function deletarConversa(conversaId: string) {
  const { supabase } = await currentAuthor();
  const { error } = await supabase.from("chat_conversas").delete().eq("id", conversaId);
  if (error) throw new Error(error.message);
}

function respostaSchema(incluirTema: boolean) {
  return {
    type: Type.OBJECT,
    properties: {
      resposta: {
        type: Type.STRING,
        description: "Resposta do assistente para o usuário, em português do Brasil",
      },
      ...(incluirTema
        ? {
            tema: {
              type: Type.STRING,
              description: "Título curto (3 a 6 palavras) resumindo o assunto desta conversa",
            },
          }
        : {}),
    },
    required: incluirTema ? ["resposta", "tema"] : ["resposta"],
  };
}

export interface EnviarMensagemResult {
  conversaId?: string;
  resposta?: string;
  error?: string;
}

// Envia uma mensagem do usuário pro assistente financeiro. Cria a conversa
// na primeira mensagem (conversaIdInicial null) e gera um tema curto pra
// ela nessa primeira troca. O contexto financeiro é montado do zero a cada
// chamada (buildFinanceContext) — nunca fica desatualizado, já que reflete
// os dados reais no momento do envio.
export async function enviarMensagemChat(
  conversaIdInicial: string | null,
  texto: string,
): Promise<EnviarMensagemResult> {
  if (!process.env.GEMINI_API_KEY) {
    return { error: "GEMINI_API_KEY não configurada no servidor." };
  }
  const mensagem = texto.trim();
  if (!mensagem) return { error: "Escreva uma mensagem antes de enviar." };

  const { supabase, autor } = await currentAuthor();
  const novaConversa = !conversaIdInicial;
  let conversaId = conversaIdInicial;

  try {
    if (!conversaId) {
      const { data, error } = await supabase.from("chat_conversas").insert({ autor }).select().single();
      if (error) throw new Error(error.message);
      conversaId = data.id as string;
    }

    const { error: userMsgError } = await supabase
      .from("chat_mensagens")
      .insert({ conversa_id: conversaId, role: "user", content: mensagem });
    if (userMsgError) throw new Error(userMsgError.message);

    const historico = await fetchChatMensagens(supabase, conversaId);
    const contexto = await buildFinanceContext(supabase);

    const systemInstruction = `Você é o assistente financeiro pessoal do app "Ninho", usado por um casal (Berg e Gabi) que espera um bebê e controla as finanças em conjunto. Você está conversando com ${autor}.

Seu papel:
1. Explicar como qualquer parte do app funciona quando perguntarem — o app tem: Painel (visão geral, gráficos, saldo futuro projetado), Lançar (registrar entradas/saídas/investimentos, com opção de marcar como recorrente e vincular a um cartão), Histórico (lista de lançamentos), Reserva (metas de investimento tipo reserva do bebê), Cartões (fatura por fechamento/vencimento), Checklist (contas fixas e entradas recorrentes a confirmar mês a mês), Orçamento (metas de gasto por categoria e pessoa, com sugestão de IA), Calendário (visão mensal de vencimentos) e Importar extrato (lê um PDF/CSV e categoriza automaticamente).
2. Dar conselhos financeiros práticos e ações preditivas baseadas SOMENTE nos dados reais fornecidos abaixo — nunca invente números.
3. Ser direto, acolhedor, sem jargão financeiro complicado. Respostas curtas (2 a 4 frases), a menos que peçam mais detalhe.
${novaConversa ? "4. Essa é a primeira mensagem desta conversa — gere também um tema (título curto) resumindo o assunto." : ""}

${contexto}`;

    const contents = historico.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

    const response = await ai.models.generateContent({
      model,
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: respostaSchema(novaConversa),
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("resposta vazia");
    const parsed = JSON.parse(jsonText) as { resposta?: unknown; tema?: unknown };
    const resposta =
      typeof parsed.resposta === "string" && parsed.resposta
        ? parsed.resposta
        : "Não consegui responder agora, tenta de novo?";

    const { error: assistantMsgError } = await supabase
      .from("chat_mensagens")
      .insert({ conversa_id: conversaId, role: "assistant", content: resposta });
    if (assistantMsgError) throw new Error(assistantMsgError.message);

    const updates: { updated_at: string; tema?: string } = { updated_at: new Date().toISOString() };
    if (novaConversa && typeof parsed.tema === "string" && parsed.tema.trim()) {
      updates.tema = parsed.tema.trim();
    }
    const { error: updateError } = await supabase
      .from("chat_conversas")
      .update(updates)
      .eq("id", conversaId);
    if (updateError) throw new Error(updateError.message);

    return { conversaId, resposta };
  } catch (err) {
    console.error("[chat] falha ao gerar resposta:", err);
    return {
      conversaId: conversaId ?? undefined,
      error: "Não foi possível responder agora. Tente novamente em instantes.",
    };
  }
}
