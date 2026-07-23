// Constantes compartilhadas entre o Route Handler do chat (servidor) e o
// ChatWidget (cliente) — sem "use server" nem dependências de Node, pra
// poder ser importado dos dois lados sem puxar código indevido pro bundle.

// Marcador que separa, no corpo da resposta em streaming, o texto
// conversacional (se houver) de uma lista de propostas de lançamento em
// JSON — o cliente parseia tudo depois desse marcador como um array de
// propostas (mesmo quando é só uma) e renderiza um cartão de confirmação
// por item em vez de texto puro.
export const LANCAMENTO_SENTINEL = "\n§§LANCAMENTO_PROPOSTO§§\n";

export interface LancamentoProposto {
  tipo: "entrada" | "saida";
  categoria: string;
  subcategoria: string;
  valor: number;
  descricao: string | null;
  date: string;
}
