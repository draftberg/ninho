"use server";

import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import { fetchAllEntries, fetchGoals } from "@/lib/data";
import { filterByMonth, sumByTipo, composicaoPorCategoria, totalByGoal, porPessoa } from "@/lib/aggregate";
import { categoriaLabel } from "@/lib/types";
import { formatBRL, monthLabel } from "@/lib/format";

export interface InsightsResult {
  bullets?: string[];
  analysis?: string;
  error?: string;
}

const INSIGHTS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    bullets: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 a 4 observações curtas (até ~110 caracteres cada) sobre o mês",
    },
    analysis: {
      type: Type.STRING,
      description: "Análise mais completa em 2-3 parágrafos curtos, com sugestões práticas de fluxo de caixa",
    },
  },
  required: ["bullets", "analysis"],
};

function previousMonthKey(mes: string): string {
  const [y, m] = mes.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function generateInsights(mes: string): Promise<InsightsResult> {
  if (!process.env.GEMINI_API_KEY) {
    return { error: "GEMINI_API_KEY não configurada no servidor." };
  }

  const supabase = await createClient();
  const [allEntries, goals] = await Promise.all([fetchAllEntries(supabase), fetchGoals(supabase)]);

  const atual = filterByMonth(allEntries, mes);
  const anterior = filterByMonth(allEntries, previousMonthKey(mes));

  const totalEntradaAtual = sumByTipo(atual, "entrada");
  const totalSaidaAtual = sumByTipo(atual, "saida");
  const totalInvestAtual = sumByTipo(atual, "investimento");
  const totalEntradaAnterior = sumByTipo(anterior, "entrada");
  const totalSaidaAnterior = sumByTipo(anterior, "saida");

  const composicao = composicaoPorCategoria(atual, "saida");
  const categoriasSaida = composicao.labels
    .map((cat, i) => ({ categoria: categoriaLabel("saida", cat), valor: composicao.values[i] }))
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 5);

  const pessoas = porPessoa(atual);

  const metasResumo = goals.map((g) => {
    const total = totalByGoal(allEntries, g.id);
    const percentual = g.valor_meta ? Math.round((total / g.valor_meta) * 100) : null;
    return { nome: g.nome, total, meta: g.valor_meta, percentual, dataAlvo: g.data_alvo };
  });

  const prompt = `Você é um assistente financeiro pessoal para um casal (Berg e Gabi) que espera um bebê e usa o app "Ninho" para controlar as finanças em conjunto.

Dados do mês de ${monthLabel(mes)}:
- Entradas: ${formatBRL(totalEntradaAtual)} (mês anterior: ${formatBRL(totalEntradaAnterior)})
- Saídas: ${formatBRL(totalSaidaAtual)} (mês anterior: ${formatBRL(totalSaidaAnterior)})
- Investido/guardado: ${formatBRL(totalInvestAtual)}
- Saldo do mês: ${formatBRL(totalEntradaAtual - totalSaidaAtual - totalInvestAtual)}

Maiores categorias de saída no mês:
${categoriasSaida.map((c) => `- ${c.categoria}: ${formatBRL(c.valor)}`).join("\n") || "- (sem saídas registradas)"}

Por pessoa:
${pessoas.map((p) => `- ${p.autor}: entrada ${formatBRL(p.entrada)}, saída ${formatBRL(p.saida)}, investimento ${formatBRL(p.investimento)}`).join("\n") || "- (sem lançamentos)"}

Metas de reserva:
${metasResumo.map((g) => `- ${g.nome}: ${formatBRL(g.total)}${g.meta ? ` de ${formatBRL(g.meta)} (${g.percentual}%)` : ""}${g.dataAlvo ? `, prazo ${g.dataAlvo}` : ""}`).join("\n") || "- (nenhuma meta criada)"}

Com base SOMENTE nesses números (não invente valores), gere:
1. "bullets": 3 a 4 observações curtas e diretas (até ~110 caracteres cada) sobre o mês — tendências, alertas, pontos positivos.
2. "analysis": uma análise um pouco mais completa (2-3 parágrafos curtos, separados por linha em branco) com sugestões práticas para melhorar o fluxo de caixa e alcançar as metas mais rápido.

Responda em português do Brasil, tom direto e acolhedor, sem jargão financeiro complicado.`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: INSIGHTS_SCHEMA,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("resposta vazia");
    const parsed = JSON.parse(jsonText) as { bullets?: unknown; analysis?: unknown };

    const bullets = Array.isArray(parsed.bullets) ? parsed.bullets.map(String) : [];
    const analysis = typeof parsed.analysis === "string" ? parsed.analysis : "";

    if (bullets.length === 0 && !analysis) throw new Error("resposta vazia");

    return { bullets, analysis };
  } catch (err) {
    console.error("[insights] falha ao gerar análise:", err);
    return { error: "Não foi possível gerar a análise agora. Tente novamente em instantes." };
  }
}
