export type Tipo = "entrada" | "saida" | "investimento";

export type SubcategoriaEntrada = "salario" | "freela" | "outros";
export type SubcategoriaSaida = "fixo" | "variavel";
export type SubcategoriaInvestimento = "nenem" | "futuro" | "reserva";

export type Subcategoria =
  | SubcategoriaEntrada
  | SubcategoriaSaida
  | SubcategoriaInvestimento;

export const SUBCATEGORIAS: Record<Tipo, { value: Subcategoria; label: string }[]> = {
  entrada: [
    { value: "salario", label: "Salário" },
    { value: "freela", label: "Freela" },
    { value: "outros", label: "Outros" },
  ],
  saida: [
    { value: "fixo", label: "Fixo" },
    { value: "variavel", label: "Variável" },
  ],
  investimento: [
    { value: "nenem", label: "Nenem" },
    { value: "futuro", label: "Futuro" },
    { value: "reserva", label: "Reserva" },
  ],
};

export const TIPO_LABELS: Record<Tipo, string> = {
  entrada: "Entrada",
  saida: "Saída",
  investimento: "Investimento",
};

export interface Entry {
  id: string;
  date: string;
  tipo: Tipo;
  subcategoria: Subcategoria;
  valor: number;
  descricao: string | null;
  autor: string;
  created_at: string;
}

export type NewEntry = Omit<Entry, "id" | "created_at">;

export interface Settings {
  id: number;
  meta_bebe: number;
}
