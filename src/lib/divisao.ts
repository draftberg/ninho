import { PERSON_DISPLAY_NAMES } from "@/lib/allowlist";
import type { Entry } from "@/lib/types";

// Só faz sentido com exatamente as 2 pessoas fixas do app.
export function outroAutor(autor: string): string {
  return PERSON_DISPLAY_NAMES.find((nome) => nome !== autor) ?? autor;
}

export interface SaldoCasal {
  credor: string;
  devedor: string;
  valor: number;
}

// Para toda saída marcada como "dividido", quem lançou (autor) pagou o total
// mas só é dono de metade — a outra metade é uma dívida do outro pra ele.
// Soma isso em todas as saídas divididas e retorna o saldo líquido final
// entre as duas pessoas (null se não houver nada dividido ou já estiver
// zerado).
export function saldoEntreCasal(entries: Entry[]): SaldoCasal | null {
  if (PERSON_DISPLAY_NAMES.length !== 2) return null;
  const [pessoaA, pessoaB] = PERSON_DISPLAY_NAMES;

  let saldoAPorB = 0; // positivo = B deve pra A; negativo = A deve pra B
  for (const entry of entries) {
    if (entry.tipo !== "saida" || !entry.dividido) continue;
    const metade = Number(entry.valor) / 2;
    if (entry.autor === pessoaA) saldoAPorB += metade;
    else if (entry.autor === pessoaB) saldoAPorB -= metade;
  }

  const arredondado = Math.round(saldoAPorB * 100) / 100;
  if (arredondado === 0) return null;

  return arredondado > 0
    ? { credor: pessoaA, devedor: pessoaB, valor: arredondado }
    : { credor: pessoaB, devedor: pessoaA, valor: -arredondado };
}
