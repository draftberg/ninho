import { monthKeyOf, monthLabel } from "@/lib/format";
import type { Entry, Tipo } from "@/lib/types";

export function monthOptions(entries: Entry[]): string[] {
  const set = new Set(entries.map((e) => monthKeyOf(e.date)));
  return Array.from(set).sort((a, b) => (a < b ? 1 : -1));
}

export function filterByMonth(entries: Entry[], month: string): Entry[] {
  if (month === "todos") return entries;
  return entries.filter((e) => monthKeyOf(e.date) === month);
}

export function sumByTipo(entries: Entry[], tipo: Tipo): number {
  return entries.filter((e) => e.tipo === tipo).reduce((sum, e) => sum + Number(e.valor), 0);
}

export function reservaBebeTotal(entries: Entry[]): number {
  return entries
    .filter((e) => e.tipo === "investimento" && e.subcategoria === "nenem")
    .reduce((sum, e) => sum + Number(e.valor), 0);
}

export function composicaoPorSubcategoria(
  entries: Entry[],
  tipo: Tipo,
): { labels: string[]; values: number[] } {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.tipo !== tipo) continue;
    totals.set(entry.subcategoria, (totals.get(entry.subcategoria) ?? 0) + Number(entry.valor));
  }
  return {
    labels: Array.from(totals.keys()),
    values: Array.from(totals.values()),
  };
}

export function composicaoPorPessoa(
  entries: Entry[],
  tipo: Tipo,
): { labels: string[]; values: number[] } {
  const totals = new Map<string, number>();
  for (const entry of entries) {
    if (entry.tipo !== tipo) continue;
    totals.set(entry.autor, (totals.get(entry.autor) ?? 0) + Number(entry.valor));
  }
  return {
    labels: Array.from(totals.keys()),
    values: Array.from(totals.values()),
  };
}

export function evolucaoUltimosMeses(
  entries: Entry[],
  quantidade = 6,
): { labels: string[]; entradas: number[]; saidas: number[] } {
  const now = new Date();
  const keys: string[] = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const entradas = keys.map((key) =>
    entries
      .filter((e) => e.tipo === "entrada" && monthKeyOf(e.date) === key)
      .reduce((sum, e) => sum + Number(e.valor), 0),
  );
  const saidas = keys.map((key) =>
    entries
      .filter((e) => e.tipo === "saida" && monthKeyOf(e.date) === key)
      .reduce((sum, e) => sum + Number(e.valor), 0),
  );

  return { labels: keys.map(monthLabel), entradas, saidas };
}

export interface PersonTotals {
  autor: string;
  entrada: number;
  saida: number;
  investimento: number;
}

export function porPessoa(entries: Entry[]): PersonTotals[] {
  const map = new Map<string, PersonTotals>();
  for (const entry of entries) {
    const current = map.get(entry.autor) ?? {
      autor: entry.autor,
      entrada: 0,
      saida: 0,
      investimento: 0,
    };
    current[entry.tipo] += Number(entry.valor);
    map.set(entry.autor, current);
  }
  return Array.from(map.values());
}
