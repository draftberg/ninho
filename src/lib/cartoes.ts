import { todayISO } from "@/lib/format";
import type { Cartao, Entry } from "@/lib/types";

export interface FaturaGroup {
  faturaKey: string; // "YYYY-MM" — mês de fechamento da fatura
  vencimento: string; // data ISO (YYYY-MM-DD) de vencimento dessa fatura
  entries: Entry[];
  total: number;
}

// Mês de fechamento ("YYYY-MM") em que uma compra feita em `dateISO` cai. Se
// o dia da compra é <= dia_fechamento, ela entra na fatura que fecha nesse
// mesmo mês; se for depois, "estoura" pro fechamento do mês seguinte.
export function faturaKeyDaCompra(dateISO: string, cartao: Cartao): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  let closingYear = y;
  let closingMonth = m;
  if (d > cartao.dia_fechamento) {
    closingMonth += 1;
    if (closingMonth > 12) {
      closingMonth = 1;
      closingYear += 1;
    }
  }
  return `${closingYear}-${String(closingMonth).padStart(2, "0")}`;
}

// Data de vencimento (ISO) da fatura identificada por `faturaKey` (mês de
// fechamento). Se dia_vencimento <= dia_fechamento, o vencimento cai no mês
// seguinte ao fechamento (ex.: fecha dia 25, vence dia 5 → vence no mês
// seguinte); senão, vence no mesmo mês do fechamento.
export function vencimentoDaFatura(faturaKey: string, cartao: Cartao): string {
  const [closingYear, closingMonth] = faturaKey.split("-").map(Number);
  let dueYear = closingYear;
  let dueMonth = closingMonth;
  if (cartao.dia_vencimento <= cartao.dia_fechamento) {
    dueMonth += 1;
    if (dueMonth > 12) {
      dueMonth = 1;
      dueYear += 1;
    }
  }
  const daysInDueMonth = new Date(dueYear, dueMonth, 0).getDate();
  const dueDay = Math.min(cartao.dia_vencimento, daysInDueMonth);
  return `${dueYear}-${String(dueMonth).padStart(2, "0")}-${String(dueDay).padStart(2, "0")}`;
}

export function entriesByCartao(entries: Entry[], cartaoId: string): Entry[] {
  return entries.filter((e) => e.tipo === "saida" && e.cartao_id === cartaoId);
}

export function totalByCartao(entries: Entry[], cartaoId: string): number {
  return entriesByCartao(entries, cartaoId).reduce((sum, e) => sum + Number(e.valor), 0);
}

function emptyFatura(faturaKey: string, cartao: Cartao): FaturaGroup {
  return { faturaKey, vencimento: vencimentoDaFatura(faturaKey, cartao), entries: [], total: 0 };
}

// Agrupa todas as compras do cartão por fatura (mês de fechamento), da mais
// recente para a mais antiga.
export function faturasDoCartao(entries: Entry[], cartao: Cartao): FaturaGroup[] {
  const map = new Map<string, Entry[]>();
  for (const e of entriesByCartao(entries, cartao.id)) {
    const key = faturaKeyDaCompra(e.date, cartao);
    map.set(key, [...(map.get(key) ?? []), e]);
  }
  return Array.from(map.entries())
    .map(([faturaKey, es]) => ({
      faturaKey,
      vencimento: vencimentoDaFatura(faturaKey, cartao),
      entries: es,
      total: es.reduce((sum, e) => sum + Number(e.valor), 0),
    }))
    .sort((a, b) => (a.faturaKey < b.faturaKey ? 1 : -1));
}

// Fatura "aberta" hoje (ainda não fechou) — usada no hero card de /cartoes.
export function faturaAberta(entries: Entry[], cartao: Cartao, today = todayISO()): FaturaGroup {
  const faturaKey = faturaKeyDaCompra(today, cartao);
  return faturasDoCartao(entries, cartao).find((g) => g.faturaKey === faturaKey) ?? emptyFatura(faturaKey, cartao);
}

// Fatura cujo VENCIMENTO cai no mês `mesVencimento` ("YYYY-MM") — usada pelo
// checklist para mostrar o total certo no mês em que o item aparece (que é o
// mês do vencimento, não o do fechamento).
export function faturaQueVenceEm(entries: Entry[], cartao: Cartao, mesVencimento: string): FaturaGroup {
  const [dueYear, dueMonth] = mesVencimento.split("-").map(Number);
  let closingYear = dueYear;
  let closingMonth = dueMonth;
  if (cartao.dia_vencimento <= cartao.dia_fechamento) {
    closingMonth -= 1;
    if (closingMonth < 1) {
      closingMonth = 12;
      closingYear -= 1;
    }
  }
  const faturaKey = `${closingYear}-${String(closingMonth).padStart(2, "0")}`;
  return faturasDoCartao(entries, cartao).find((g) => g.faturaKey === faturaKey) ?? emptyFatura(faturaKey, cartao);
}
