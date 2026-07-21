"use server";

import { GoogleGenAI, Type } from "@google/genai";
import {
  CATEGORIAS,
  categoriasDoTipo,
  subcategoriasDaCategoria,
  type NewEntry,
  type Tipo,
} from "@/lib/types";
import { todayISO } from "@/lib/format";

const TIPOS: Tipo[] = ["entrada", "saida", "investimento"];

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

const TRANSACTION_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      tipo: { type: Type.STRING, enum: TIPOS },
      categoria: { type: Type.STRING, description: "Uma das categorias válidas para o tipo" },
      subcategoria: {
        type: Type.STRING,
        description: "Uma das subcategorias válidas para a categoria escolhida",
      },
      valor: { type: Type.NUMBER },
      descricao: { type: Type.STRING },
      date: { type: Type.STRING, description: "Data no formato YYYY-MM-DD" },
    },
    required: ["tipo", "categoria", "subcategoria", "valor", "descricao", "date"],
  },
};

function arvoreDeCategorias(): string {
  return TIPOS.map((tipo) => {
    const categorias = CATEGORIAS[tipo]
      .map((c) => `    - "${c.value}" (${c.label}): ${c.subcategorias.map((s) => `"${s.value}"`).join(", ")}`)
      .join("\n");
    return `  ${tipo}:\n${categorias}`;
  }).join("\n");
}

function categoriaValida(tipo: Tipo, categoria: string): string {
  const categorias = categoriasDoTipo(tipo);
  return categorias.some((c) => c.value === categoria) ? categoria : categorias[categorias.length - 1].value;
}

function subcategoriaValida(tipo: Tipo, categoria: string, subcategoria: string): string {
  const subcategorias = subcategoriasDaCategoria(tipo, categoria);
  return subcategorias.some((s) => s.value === subcategoria) ? subcategoria : subcategorias[0].value;
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

  if (!process.env.GEMINI_API_KEY) {
    return { error: "GEMINI_API_KEY não configurada no servidor." };
  }

  let text: string;
  try {
    text = await extractText(file);
  } catch {
    return { error: "Não foi possível ler o arquivo enviado." };
  }

  const trimmed = text.slice(0, 15000);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  const prompt = `Você recebe abaixo o conteúdo de um extrato financeiro (PDF/CSV/TXT convertido em texto).
Extraia cada transação e classifique cada uma usando exatamente esta árvore de tipo → categoria → subcategoria
(use sempre os valores entre aspas, nunca o rótulo em português):

${arvoreDeCategorias()}

Para cada transação retorne:
- "tipo": um dos 3 valores acima
- "categoria": uma categoria válida para o tipo escolhido
- "subcategoria": uma subcategoria válida para a categoria escolhida
- "valor": número positivo (sem símbolo de moeda)
- "descricao": descrição curta da transação
- "date": data no formato YYYY-MM-DD (se o ano não estiver claro, use o ano atual)

Conteúdo do extrato:
"""
${trimmed}
"""`;

  let raw: unknown[];
  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: TRANSACTION_SCHEMA,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("resposta vazia");
    raw = JSON.parse(jsonText);
  } catch {
    return { error: "Não foi possível interpretar a resposta da IA." };
  }

  const transactions: NewEntry[] = raw
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item) => {
      const tipo = TIPOS.includes(item.tipo as Tipo) ? (item.tipo as Tipo) : "saida";
      const categoria = categoriaValida(tipo, String(item.categoria ?? ""));
      const subcategoria = subcategoriaValida(tipo, categoria, String(item.subcategoria ?? ""));
      const valor = Number(item.valor) || 0;
      const date =
        typeof item.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(item.date)
          ? item.date
          : todayISO();

      return {
        tipo,
        categoria,
        subcategoria,
        valor,
        descricao: typeof item.descricao === "string" ? item.descricao : null,
        date,
        autor: "",
        goal_id: null,
        cartao_id: null,
      };
    })
    .filter((t) => t.valor > 0);

  if (transactions.length === 0) {
    return { error: "Nenhuma transação foi identificada no arquivo." };
  }

  return { transactions };
}
