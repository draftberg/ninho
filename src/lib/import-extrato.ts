"use server";

import Anthropic from "@anthropic-ai/sdk";
import type { NewEntry, Subcategoria, Tipo } from "@/lib/types";
import { todayISO } from "@/lib/format";

const TIPOS: Tipo[] = ["entrada", "saida", "investimento"];
const SUBCATEGORIAS_VALIDAS: Subcategoria[] = [
  "salario",
  "freela",
  "outros",
  "fixo",
  "variavel",
  "nenem",
  "futuro",
  "reserva",
];

async function extractText(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      return result.text;
    } finally {
      await parser.destroy();
    }
  }

  return buffer.toString("utf-8");
}

function parseJsonArray(raw: string): unknown[] {
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("A IA não retornou um JSON válido.");
  return JSON.parse(match[0]);
}

export interface ExtractionResult {
  transactions?: NewEntry[];
  error?: string;
}

export async function extractTransactions(formData: FormData): Promise<ExtractionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Selecione um arquivo (PDF, CSV ou TXT)." };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { error: "ANTHROPIC_API_KEY não configurada no servidor." };
  }

  let text: string;
  try {
    text = await extractText(file);
  } catch {
    return { error: "Não foi possível ler o arquivo enviado." };
  }

  const trimmed = text.slice(0, 15000);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-5";

  const prompt = `Você recebe abaixo o conteúdo de um extrato financeiro (PDF/CSV/TXT convertido em texto).
Extraia cada transação e classifique cada uma em:
- "tipo": um de "entrada", "saida", "investimento"
- "subcategoria": conforme o tipo:
  - entrada: "salario", "freela", "outros"
  - saida: "fixo", "variavel"
  - investimento: "nenem", "futuro", "reserva"
- "valor": número positivo (sem símbolo de moeda)
- "descricao": descrição curta da transação
- "date": data no formato YYYY-MM-DD (se o ano não estiver claro, use o ano atual)

Responda APENAS com um JSON array de objetos com essas 5 chaves, sem nenhum texto adicional.

Conteúdo do extrato:
"""
${trimmed}
"""`;

  const message = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    return { error: "A IA não retornou texto." };
  }

  let raw: unknown[];
  try {
    raw = parseJsonArray(textBlock.text);
  } catch {
    return { error: "Não foi possível interpretar a resposta da IA." };
  }

  const transactions: NewEntry[] = raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const tipo = TIPOS.includes(item.tipo as Tipo) ? (item.tipo as Tipo) : "saida";
      const subcategoriaCandidata = item.subcategoria as Subcategoria;
      const subcategoria = SUBCATEGORIAS_VALIDAS.includes(subcategoriaCandidata)
        ? subcategoriaCandidata
        : ("outros" as Subcategoria);
      const valor = Number(item.valor) || 0;
      const date =
        typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
          ? item.date
          : todayISO();

      return {
        tipo,
        subcategoria,
        valor,
        descricao: typeof item.descricao === "string" ? item.descricao : null,
        date,
        autor: "",
      };
    })
    .filter((t) => t.valor > 0);

  if (transactions.length === 0) {
    return { error: "Nenhuma transação foi identificada no arquivo." };
  }

  return { transactions };
}
