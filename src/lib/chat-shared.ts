// Constantes compartilhadas entre o Route Handler do chat (servidor) e o
// ChatWidget (cliente) — sem "use server" nem dependências de Node, pra
// poder ser importado dos dois lados sem puxar código indevido pro bundle.

// Marcador que separa, no corpo da resposta em streaming, o texto
// conversacional (se houver) de uma proposta de lançamento em JSON — o
// cliente parseia tudo depois desse marcador como a proposta e renderiza um
// cartão de confirmação em vez de texto puro.
export const LANCAMENTO_SENTINEL = "\n§§LANCAMENTO_PROPOSTO§§\n";

export interface LancamentoProposto {
  tipo: "entrada" | "saida";
  categoria: string;
  subcategoria: string;
  valor: number;
  descricao: string | null;
  date: string;
}
