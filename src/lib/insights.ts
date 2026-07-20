"use server";

import { GoogleGenAI, Type } from "@google/genai";
import { createClient } from "@/lib/supabase/server";
import {
  fetchAllEntries,
  fetchGoals,
  fetchProfiles,
  fetchChecklistItems,
  fetchBudgetLimits,
} from "@/lib/data";
import { filterByMonth, sumByTipo, composicaoPorCategoria, totalByGoal, porPessoa } from "@/lib/aggregate";
import { buildCashFlow } from "@/lib/cashflow";
import { goalProjections } from "@/lib/projections";
import { categoriaLabel, categoriasDoTipo, salarioTotal } from "@/lib/types";
import { formatBRL, monthLabel, monthKeyOf } from "@/lib/format";

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

export interface BudgetSuggestion {
  autor: string;
  categoria: string;
  limite_mensal: number;
  justificativa: string;
}

export interface BudgetSuggestionsResult {
  suggestions?: BudgetSuggestion[];
  error?: string;
}

const BUDGET_SUGGESTIONS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    suggestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          autor: { type: Type.STRING, description: "nome exato da pessoa, igual ao informado nos dados" },
          categoria: {
            type: Type.STRING,
            description: "valor exato da categoria (o 'value', não o label), igual ao informado nos dados",
          },
          limite_mensal: { type: Type.NUMBER, description: "limite mensal sugerido em reais, > 0" },
          justificativa: { type: Type.STRING, description: "1 frase curta explicando o valor sugerido" },
        },
        required: ["autor", "categoria", "limite_mensal", "justificativa"],
      },
    },
  },
  required: ["suggestions"],
};

function last3MonthKeys(): string[] {
  const now = new Date();
  return Array.from({ length: 3 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (i + 1), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

// Sugere um limite mensal de gasto por pessoa/categoria com base no salário
// cadastrado no Perfil e na média de gasto real dos últimos 3 meses. Não
// salva nada — a tela de Orçamento mostra as sugestões pra revisão antes de
// confirmar (ver src/lib/actions.ts: upsertBudgetLimits).
export async function suggestBudgetLimits(): Promise<BudgetSuggestionsResult> {
  if (!process.env.GEMINI_API_KEY) {
    return { error: "GEMINI_API_KEY não configurada no servidor." };
  }

  const supabase = await createClient();
  const [allEntries, profiles] = await Promise.all([fetchAllEntries(supabase), fetchProfiles(supabase)]);

  const meses = last3MonthKeys();
  const gastos = allEntries.filter((e) => e.tipo === "saida" && meses.includes(monthKeyOf(e.date)));

  const mediaPorAutorCategoria = new Map<string, number>();
  for (const entry of gastos) {
    const key = `${entry.autor}|${entry.categoria}`;
    mediaPorAutorCategoria.set(key, (mediaPorAutorCategoria.get(key) ?? 0) + Number(entry.valor));
  }

  const historico = Array.from(mediaPorAutorCategoria.entries()).map(([key, total]) => {
    const [autor, categoria] = key.split("|");
    return { autor, categoria: categoriaLabel("saida", categoria), categoriaValue: categoria, media: total / 3 };
  });

  if (historico.length === 0) {
    return { error: "Ainda não há gastos suficientes nos últimos 3 meses para sugerir metas." };
  }

  const salariosPorPessoa = profiles
    .map((p) => ({ nome: p.nome ?? "Sem nome", salario: salarioTotal(p) }))
    .filter((p) => p.salario > 0);

  const categoriasValidas = categoriasDoTipo("saida").map((c) => c.value);

  const prompt = `Você é um assistente financeiro pessoal para um casal (Berg e Gabi) que espera um bebê e usa o app "Ninho".

Sugira um limite mensal de gasto (orçamento) por pessoa e por categoria, com base no salário de cada um e no gasto médio real dos últimos 3 meses.

Salário mensal por pessoa:
${salariosPorPessoa.map((p) => `- ${p.nome}: ${formatBRL(p.salario)}`).join("\n") || "- (nenhum salário cadastrado no Perfil)"}

Gasto médio mensal real (últimos 3 meses) por pessoa e categoria:
${historico.map((h) => `- ${h.autor} · ${h.categoria} (value: "${h.categoriaValue}"): ${formatBRL(h.media)}/mês`).join("\n")}

Categorias válidas (use exatamente esses "value" no campo categoria): ${categoriasValidas.join(", ")}

Regras:
1. Gere no máximo 1 sugestão por combinação pessoa+categoria, só para combinações que aparecem no gasto médio acima (não invente categorias sem histórico).
2. O limite sugerido deve ser realista: perto da média histórica, um pouco mais apertado nas categorias onde dá pra economizar (lazer, assinaturas, outros), mantendo folga nas essenciais (moradia, contas, alimentação, saúde).
3. A soma dos limites sugeridos de uma pessoa não deve ultrapassar o salário dela.
4. "categoria" no JSON deve ser o "value" exato da lista de categorias válidas, não o nome em português.
5. "autor" deve ser exatamente o nome da pessoa como aparece nos dados acima.

Responda em português do Brasil.`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: BUDGET_SUGGESTIONS_SCHEMA,
      },
    });

    const jsonText = response.text;
    if (!jsonText) throw new Error("resposta vazia");
    const parsed = JSON.parse(jsonText) as { suggestions?: unknown };
    if (!Array.isArray(parsed.suggestions)) throw new Error("resposta inválida");

    const suggestions = parsed.suggestions
      .filter(
        (s): s is BudgetSuggestion =>
          typeof s === "object" &&
          s !== null &&
          typeof (s as BudgetSuggestion).autor === "string" &&
          typeof (s as BudgetSuggestion).categoria === "string" &&
          categoriasValidas.includes((s as BudgetSuggestion).categoria) &&
          typeof (s as BudgetSuggestion).limite_mensal === "number" &&
          (s as BudgetSuggestion).limite_mensal > 0,
      )
      .map((s) => ({ ...s, justificativa: s.justificativa || "" }));

    if (suggestions.length === 0) throw new Error("nenhuma sugestão válida");

    return { suggestions };
  } catch (err) {
    console.error("[insights] falha ao sugerir metas de gasto:", err);
    return { error: "Não foi possível gerar sugestões agora. Tente novamente em instantes." };
  }
}

const PREDICTIVE_ACTIONS_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    bullets: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 a 4 ações preditivas curtas e concretas (até ~110 caracteres cada)",
    },
    analysis: {
      type: Type.STRING,
      description:
        "Análise mais completa em 2-3 parágrafos curtos, com ações práticas e priorizadas para bater as metas no prazo",
    },
  },
  required: ["bullets", "analysis"],
};

function currentYearKey(): string {
  return String(new Date().getFullYear());
}

// Gera ações preditivas (o que fazer AGORA pra bater as metas no prazo,
// aproveitando o fluxo de caixa futuro e as metas de gasto por categoria)
// combinando os cálculos puros de goalProjections/buildCashFlow com uma
// leitura da IA sobre o que priorizar.
export async function generatePredictiveActions(): Promise<InsightsResult> {
  if (!process.env.GEMINI_API_KEY) {
    return { error: "GEMINI_API_KEY não configurada no servidor." };
  }

  const supabase = await createClient();
  const [allEntries, goals, checklistItems, profiles, budgetLimits] = await Promise.all([
    fetchAllEntries(supabase),
    fetchGoals(supabase),
    fetchChecklistItems(supabase),
    fetchProfiles(supabase),
    fetchBudgetLimits(supabase),
  ]);

  const ano = currentYearKey();
  const projecoes = goalProjections(allEntries, goals).filter((p) => p.status !== "sem_prazo");
  const cashFlow = buildCashFlow(allEntries, checklistItems, profiles, ano);
  const ultimaColuna = cashFlow[cashFlow.length - 1];
  const mesesNegativos = cashFlow.filter((c) => c.saldoAcumulado < 0).length;

  const mesAtual = new Date().toISOString().slice(0, 7);
  const gastoAtual = filterByMonth(allEntries, mesAtual).filter((e) => e.tipo === "saida");
  const gastoPorChave = new Map<string, number>();
  for (const e of gastoAtual) {
    const key = `${e.autor}|${e.categoria}`;
    gastoPorChave.set(key, (gastoPorChave.get(key) ?? 0) + Number(e.valor));
  }
  const estourosOrcamento = budgetLimits
    .map((limit) => ({
      autor: limit.autor,
      categoria: categoriaLabel("saida", limit.categoria),
      limite: limit.limite_mensal,
      gasto: gastoPorChave.get(`${limit.autor}|${limit.categoria}`) ?? 0,
    }))
    .filter((b) => b.gasto > b.limite);

  if (projecoes.length === 0 && !ultimaColuna) {
    return { error: "Ainda não há metas com prazo ou dados suficientes pra gerar uma projeção." };
  }

  const prompt = `Você é um assistente financeiro pessoal para um casal (Berg e Gabi) que espera um bebê e usa o app "Ninho".

Projeção de metas com prazo definido:
${
  projecoes
    .map(
      (p) =>
        `- ${p.goal.nome}: ${formatBRL(p.totalAtual)} de ${formatBRL(p.goal.valor_meta ?? 0)}, prazo ${p.goal.data_alvo}, ritmo atual ${formatBRL(p.ritmoMensal)}/mês, precisa de ${formatBRL(p.valorNecessarioPorMes ?? 0)}/mês — status: ${p.status === "atrasada" ? "ATRASADA" : p.status === "concluida" ? "concluída" : "no ritmo"}`,
    )
    .join("\n") || "- (nenhuma meta com prazo definido)"
}

Fluxo de caixa projetado de ${ano}:
- Saldo acumulado hoje: ${formatBRL(cashFlow.find((c) => !c.projetado && c.key <= mesAtual)?.saldoAcumulado ?? cashFlow[0]?.saldoAnterior ?? 0)}
- Saldo acumulado projetado no fim do ano: ${formatBRL(ultimaColuna?.saldoAcumulado ?? 0)}
- Meses do ano com saldo acumulado negativo: ${mesesNegativos}

Categorias estourando a meta de gasto este mês:
${estourosOrcamento.map((b) => `- ${b.autor} · ${b.categoria}: ${formatBRL(b.gasto)} de ${formatBRL(b.limite)}`).join("\n") || "- (nenhuma)"}

Com base SOMENTE nesses números (não invente valores), gere ações preditivas — o que o casal deve fazer AGORA pra bater as metas no prazo e não estourar o orçamento:
1. "bullets": 3 a 4 ações curtas, diretas e priorizadas (até ~110 caracteres cada).
2. "analysis": 2-3 parágrafos curtos com o raciocínio e as ações mais detalhadas, priorizando as metas atrasadas e os estouros de orçamento.

Responda em português do Brasil, tom direto e acolhedor, sem jargão financeiro complicado.`;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const model = process.env.GEMINI_MODEL || "gemini-flash-latest";

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: PREDICTIVE_ACTIONS_SCHEMA,
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
    console.error("[insights] falha ao gerar ações preditivas:", err);
    return { error: "Não foi possível gerar as ações agora. Tente novamente em instantes." };
  }
}
