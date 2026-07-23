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

const TIPOS_ARQUIVO_ACEITOS = ["image/jpeg", "image/png", "application/pdf"];
const TAMANHO_MAXIMO_ARQUIVO = 4 * 1024 * 1024; // 4MB — teto conservador de corpo de requisição

interface Anexo {
  mimeType: string;
  base64: string;
  nomeArquivo: string;
}

// Converte os bytes do arquivo pra base64 sem usar `Buffer` — no Edge
// Runtime só APIs Web (como `btoa`) são garantidas, `Buffer` não é global.
async function arquivoParaBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

interface CorpoRequisicao {
  conversaId: string | null;
  texto: string;
  anexo: Anexo | null;
}

async function lerCorpoRequisicao(request: Request): Promise<CorpoRequisicao | { erro: string }> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const conversaId = (formData.get("conversaId") as string) || null;
    const texto = ((formData.get("texto") as string) ?? "").trim();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return { erro: "Anexo inválido." };
    }
    if (!TIPOS_ARQUIVO_ACEITOS.includes(file.type)) {
      return { erro: "Anexo precisa ser uma imagem (JPEG/PNG) ou um PDF." };
    }
    if (file.size > TAMANHO_MAXIMO_ARQUIVO) {
      return { erro: "Arquivo muito grande — o limite é 4MB." };
    }

    const base64 = await arquivoParaBase64(file);
    return { conversaId, texto, anexo: { mimeType: file.type, base64, nomeArquivo: file.name } };
  }

  const body = await request.json();
  return { conversaId: body.conversaId ?? null, texto: (body.texto ?? "").trim(), anexo: null };
}

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

const ITEM_LANCAMENTO_SCHEMA = {
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
      description: "Data no formato YYYY-MM-DD; use a data de hoje se não for possível saber",
    },
  },
  required: ["tipo", "categoria", "subcategoria", "valor"],
};

const PROPOR_LANCAMENTOS_TOOL = {
  functionDeclarations: [
    {
      name: "propor_lancamentos",
      description:
        'Registra uma ou mais PROPOSTAS de lançamento financeiro (entrada ou saída) para o usuário revisar e confirmar. Chame esta função quando o usuário pedir explicitamente para anotar/registrar/lançar um gasto ou recebimento (ex: "gastei 50 no mercado", "recebi 200 de freelance ontem" — um único item em "itens"), ou quando o usuário anexar uma foto/PDF de comprovante, nota fiscal, fatura ou extrato — nesse caso, extraia UM item em "itens" por transação real encontrada no documento (pode ser vários, se for um extrato com várias linhas). Nunca chame para perguntas, pedidos de conselho ou dúvidas sobre o app.',
      parameters: {
        type: Type.OBJECT,
        properties: {
          itens: {
            type: Type.ARRAY,
            items: ITEM_LANCAMENTO_SCHEMA,
            description: "Um item por lançamento identificado",
          },
        },
        required: ["itens"],
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

  let body: CorpoRequisicao;
  try {
    const resultado = await lerCorpoRequisicao(request);
    if ("erro" in resultado) {
      return new Response(resultado.erro, { status: 400 });
    }
    body = resultado;
  } catch {
    return new Response("Corpo da requisição inválido.", { status: 400 });
  }

  if (!body.texto && !body.anexo) {
    return new Response("Escreva uma mensagem antes de enviar.", { status: 400 });
  }

  // legenda do usuário + marcação textual do anexo (se houver) — é o que
  // fica salvo em chat_mensagens e mostrado no histórico da conversa; o
  // arquivo em si não é persistido em lugar nenhum, só usado nesta chamada.
  const mensagem = body.anexo
    ? [body.texto, `📎 ${body.anexo.nomeArquivo}`].filter(Boolean).join("\n")
    : body.texto;

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
1. Explicar como qualquer parte do app funciona quando perguntarem — o app tem: Painel (visão geral, gráficos, saldo futuro projetado), Lançar (registrar entradas/saídas/investimentos, com opção de marcar como recorrente e vincular a um cartão), Histórico (lista de lançamentos), Reserva (metas de investimento tipo reserva do bebê), Cartões (fatura por fechamento/vencimento), Checklist (contas fixas e entradas recorrentes a confirmar mês a mês), Orçamento (metas de gasto por categoria e pessoa, com sugestão de IA), Calendário (visão mensal de vencimentos) e Importar extrato (lê um PDF/CSV e categoriza automaticamente). Você também consegue ler foto ou PDF de comprovante, nota fiscal, fatura ou extrato anexados direto na conversa.
2. Dar conselhos financeiros práticos e ações preditivas baseadas SOMENTE nos dados reais fornecidos abaixo — nunca invente números.
3. Ser direto, acolhedor, sem jargão financeiro complicado. Respostas curtas (2 a 4 frases), a menos que peçam mais detalhe. Responda em texto corrido, sem markdown.
4. Quando o usuário pedir pra anotar/registrar/lançar um gasto ou recebimento (entrada ou saída), chame a função propor_lancamentos com um item em "itens" pros dados extraídos — nunca invente que já lançou algo em texto, sempre use a função. Isso vale também quando VOCÊ mesmo sugeriu lançar algo numa mensagem anterior (ex: "posso deixar esse gasto pré-lançado, é só avisar") e o usuário confirma depois, mesmo que a confirmação seja curta (ex: "por favor", "sim", "pode lançar") — use os dados da sua própria sugestão anterior nesse caso. Quando o usuário anexar uma foto/PDF de comprovante, nota fiscal, fatura ou extrato, analise o documento e chame propor_lancamentos com UM item por transação real encontrada (pode ser vários, se o documento tiver várias linhas). Classifique usando exatamente esta árvore de tipo → categoria → subcategoria (use sempre os valores entre aspas, nunca o rótulo em português):

${arvoreCategoriasLancamento()}

Se o usuário não disser a data, use ${todayISO()} (hoje). Só funciona para entrada/saída simples — não ofereça isso para investimentos, metas, cartão ou recorrência ainda.

${contexto}`;

    const textoParaModelo = body.texto || (body.anexo ? "Analise este comprovante/documento e proponha os lançamentos correspondentes." : mensagem);

    const ultimoTurnoParts: object[] = [{ text: textoParaModelo }];
    if (body.anexo) {
      ultimoTurnoParts.push({ inlineData: { mimeType: body.anexo.mimeType, data: body.anexo.base64 } });
    }

    const contents = [
      ...priorMensagens.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      { role: "user", parts: ultimoTurnoParts },
    ];

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

    const streamResult = await ai.models.generateContentStream({
      model,
      contents,
      config: { systemInstruction, tools: [PROPOR_LANCAMENTOS_TOOL] },
    });

    const encoder = new TextEncoder();
    const finalConversaId = conversaId;

    // Resolvida quando o streaming termina, com o que precisa ser
    // persistido — o `after()` abaixo espera por ela antes de gravar nada.
    let resolveStreamDone: (result: { fullText: string; qtdPropostas: number }) => void;
    const streamDone = new Promise<{ fullText: string; qtdPropostas: number }>((resolve) => {
      resolveStreamDone = resolve;
    });

    const stream = new ReadableStream({
      async start(controller) {
        let fullText = "";
        let itensArgs: Record<string, unknown>[] | null = null;
        let qtdPropostas = 0;

        try {
          for await (const chunk of streamResult) {
            const calls = chunk.functionCalls;
            const call = calls?.find((c) => c.name === "propor_lancamentos");
            if (Array.isArray(call?.args?.itens)) itensArgs = call.args.itens as Record<string, unknown>[];

            const text = chunk.text ?? "";
            if (text) {
              fullText += text;
              controller.enqueue(encoder.encode(text));
            }
          }

          if (itensArgs) {
            const propostas = itensArgs
              .map((item) => {
                const tipo: TipoLancamento = item.tipo === "entrada" ? "entrada" : "saida";
                const categoria = categoriaValidaLancamento(tipo, String(item.categoria ?? ""));
                const subcategoria = subcategoriaValidaLancamento(
                  tipo,
                  categoria,
                  String(item.subcategoria ?? ""),
                );
                const valor = Math.abs(Number(item.valor) || 0);
                const date =
                  typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
                    ? item.date
                    : todayISO();
                const descricao =
                  typeof item.descricao === "string" && item.descricao.trim()
                    ? item.descricao.trim()
                    : null;

                return { tipo, categoria, subcategoria, valor, descricao, date };
              })
              .filter((p) => p.valor > 0);

            if (propostas.length > 0) {
              controller.enqueue(encoder.encode(LANCAMENTO_SENTINEL + JSON.stringify(propostas)));
              qtdPropostas = propostas.length;
            }
          }
        } catch (err) {
          console.error("[chat] falha durante o streaming:", err);
          if (!fullText) controller.enqueue(encoder.encode(FALLBACK));
        } finally {
          controller.close();
          resolveStreamDone({ fullText, qtdPropostas });
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
      const { fullText, qtdPropostas } = await streamDone;

      const { error: userMsgError } = await userMsgPromise;
      if (userMsgError) console.error("[chat] falha ao salvar mensagem do usuário:", userMsgError);

      const respostaFinal =
        fullText ||
        (qtdPropostas > 1
          ? `Deixei ${qtdPropostas} propostas de lançamento pra você revisar.`
          : qtdPropostas === 1
            ? "Deixei uma proposta de lançamento pra você confirmar."
            : FALLBACK);
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
