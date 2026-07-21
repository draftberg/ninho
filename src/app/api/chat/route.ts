import { GoogleGenAI, Type } from "@google/genai";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { personNameFor } from "@/lib/allowlist";
import { buildFinanceContext } from "@/lib/chat-context";
import { fetchChatMensagens } from "@/lib/data";
import { CATEGORIAS, categoriasDoTipo, subcategoriasDaCategoria } from "@/lib/types";
import { todayISO } from "@/lib/format";
import { LANCAMENTO_SENTINEL } from "@/lib/chat-shared";

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

const TIPOS_LANCAMENTO = ["entrada", "saida"] as const;
type TipoLancamento = (typeof TIPOS_LANCAMENTO)[number];

function arvoreCategoriasLancamento(): string {
  return TIPOS_LANCAMENTO.map((tipo) => {
    const categorias = CATEGORIAS[tipo]
      .map((c) => `    - "${c.value}" (${c.label}): ${c.subcategorias.map((s) => `"${s.value}"`).join(", ")}`)
      .join("\n");
    return `  ${tipo}:\n${categorias}`;
  }).join("\n");
}

function categoriaValidaLancamento(tipo: TipoLancamento, categoria: string): string {
  const categorias = categoriasDoTipo(tipo);
  return categorias.some((c) => c.value === categoria)
    ? categoria
    : categorias[categorias.length - 1].value;
}

function subcategoriaValidaLancamento(
  tipo: TipoLancamento,
  categoria: string,
  subcategoria: string,
): string {
  const subcategorias = subcategoriasDaCategoria(tipo, categoria);
  return subcategorias.some((s) => s.value === subcategoria) ? subcategoria : subcategorias[0].value;
}

const PROPOR_LANCAMENTO_TOOL = {
  functionDeclarations: [
    {
      name: "propor_lancamento",
      description:
        'Registra uma PROPOSTA de lançamento financeiro (entrada ou saída) para o usuário revisar e confirmar. Só chame esta função quando o usuário pedir explicitamente para anotar/registrar/lançar um gasto ou recebimento (ex: "gastei 50 no mercado", "recebi 200 de freelance ontem"). Nunca chame para perguntas, pedidos de conselho ou dúvidas sobre o app.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          tipo: {
            type: Type.STRING,
            enum: [...TIPOS_LANCAMENTO],
            description: "Se é dinheiro que entrou (entrada) ou saiu (saida)",
          },
          categoria: {
            type: Type.STRING,
            description: "Uma categoria válida para o tipo escolhido, na árvore fornecida",
          },
          subcategoria: {
            type: Type.STRING,
            description: "Uma subcategoria válida para a categoria escolhida, na árvore fornecida",
          },
          valor: { type: Type.NUMBER, description: "Valor em reais, sempre positivo" },
          descricao: { type: Type.STRING, description: "Descrição curta do lançamento" },
          date: {
            type: Type.STRING,
            description: "Data no formato YYYY-MM-DD; use a data de hoje se o usuário não especificar",
          },
        },
        required: ["tipo", "categoria", "subcategoria", "valor"],
      },
    },
  ],
};

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
4. Quando o usuário pedir pra anotar/registrar/lançar um gasto ou recebimento (entrada ou saída), chame a função propor_lancamento com os dados extraídos — nunca invente que já lançou algo em texto, sempre use a função. Isso vale também quando VOCÊ mesmo sugeriu lançar algo numa mensagem anterior (ex: "posso deixar esse gasto pré-lançado, é só avisar") e o usuário confirma depois, mesmo que a confirmação seja curta (ex: "por favor", "sim", "pode lançar") — use os dados da sua própria sugestão anterior nesse caso. Classifique usando exatamente esta árvore de tipo → categoria → subcategoria (use sempre os valores entre aspas, nunca o rótulo em português):

${arvoreCategoriasLancamento()}

Se o usuário não disser a data, use ${todayISO()} (hoje). Só funciona para entrada/saída simples — não ofereça isso para investimentos, metas, cartão ou recorrência ainda.

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
      config: { systemInstruction, tools: [PROPOR_LANCAMENTO_TOOL] },
    });

    const encoder = new TextEncoder();
    const finalConversaId = conversaId;

    // Resolvida quando o streaming termina, com o que precisa ser
    // persistido — o `after()` abaixo espera por ela antes de gravar nada.
    let resolveStreamDone: (result: { fullText: string; propostaEnviada: boolean }) => void;
    const streamDone = new Promise<{ fullText: string; propostaEnviada: boolean }>((resolve) => {
      resolveStreamDone = resolve;
    });

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = "";
        let propostaArgs: Record<string, unknown> | null = null;
        let propostaEnviada = false;

        try {
          for await (const chunk of streamResult) {
            const calls = chunk.functionCalls;
            const call = calls?.find((c) => c.name === "propor_lancamento");
            if (call?.args) propostaArgs = call.args;

            const text = chunk.text ?? "";
            if (text) {
              fullText += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          if (propostaArgs) {
            const tipo: TipoLancamento = propostaArgs.tipo === "entrada" ? "entrada" : "saida";
            const categoria = categoriaValidaLancamento(tipo, String(propostaArgs.categoria ?? ""));
            const subcategoria = subcategoriaValidaLancamento(
              tipo,
              categoria,
              String(propostaArgs.subcategoria ?? ""),
            );
            const valor = Math.abs(Number(propostaArgs.valor) || 0);
            const date =
              typeof propostaArgs.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(propostaArgs.date)
                ? propostaArgs.date
                : todayISO();
            const descricao =
              typeof propostaArgs.descricao === "string" && propostaArgs.descricao.trim()
                ? propostaArgs.descricao.trim()
                : null;

            if (valor > 0) {
              const proposta = { tipo, categoria, subcategoria, valor, descricao, date };
              controller.enqueue(encoder.encode(LANCAMENTO_SENTINEL + JSON.stringify(proposta)));
              propostaEnviada = true;
            }
          }
        } catch (err) {
          console.error("[chat] falha durante o streaming:", err);
          if (!fullText) controller.enqueue(encoder.encode(FALLBACK));
        } finally {
          controller.close();
          resolveStreamDone({ fullText, propostaEnviada });
        }
      },
    });

    // Grava a mensagem do usuário e a resposta do assistente DEPOIS que a
    // resposta HTTP já foi enviada — usar `after()` (em vez de só aguardar
    // dentro do ReadableStream) garante que a função continue rodando até
    // essas escritas terminarem, mesmo que a plataforma considere a conexão
    // com o cliente encerrada assim que o streaming acaba. Sem isso, a
    // gravação podia ser cortada no meio e a próxima mensagem do usuário
    // chegava sem o histórico da conversa.
    after(async () => {
      const { fullText, propostaEnviada } = await streamDone;

      const { error: userMsgError } = await userMsgPromise;
      if (userMsgError) console.error("[chat] falha ao salvar mensagem do usuário:", userMsgError);

      const respostaFinal =
        fullText || (propostaEnviada ? "Deixei uma proposta de lançamento pra você confirmar." : FALLBACK);
      const { error: assistantMsgError } = await supabase
        .from("chat_mensagens")
        .insert({ conversa_id: finalConversaId, role: "assistant", content: respostaFinal });
      if (assistantMsgError) console.error("[chat] falha ao salvar resposta:", assistantMsgError);

      const { error: updateError } = await supabase
        .from("chat_conversas")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", finalConversaId);
      if (updateError) console.error("[chat] falha ao atualizar conversa:", updateError);
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
