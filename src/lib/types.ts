export type Tipo = "entrada" | "saida" | "investimento";

export interface SubcategoriaOption {
  value: string;
  label: string;
}

export interface CategoriaOption {
  value: string;
  label: string;
  subcategorias: SubcategoriaOption[];
}

// Árvore de categorias: tipo -> categoria -> subcategoria.
// Baseada no controle financeiro que o casal já usava antes do Ninho.
export const CATEGORIAS: Record<Tipo, CategoriaOption[]> = {
  entrada: [
    {
      value: "salario",
      label: "Salário",
      subcategorias: [
        { value: "salario", label: "Salário" },
        { value: "13-ferias", label: "13º/Férias" },
        { value: "bonus", label: "Bônus/PLR" },
      ],
    },
    {
      value: "freelance",
      label: "Freelance",
      subcategorias: [
        { value: "projeto", label: "Projeto" },
        { value: "consultoria", label: "Consultoria" },
        { value: "outros", label: "Outros" },
      ],
    },
    {
      value: "rendimentos",
      label: "Rendimentos",
      subcategorias: [
        { value: "dividendos", label: "Dividendos" },
        { value: "juros", label: "Juros" },
        { value: "outros", label: "Outros" },
      ],
    },
    {
      value: "outros",
      label: "Outros",
      subcategorias: [
        { value: "reembolso", label: "Reembolso" },
        { value: "presente", label: "Presente" },
        { value: "outros", label: "Outros" },
      ],
    },
  ],
  saida: [
    {
      value: "moradia",
      label: "Moradia",
      subcategorias: [
        { value: "aluguel", label: "Aluguel/Financiamento" },
        { value: "condominio", label: "Condomínio" },
        { value: "iptu", label: "IPTU" },
        { value: "manutencao", label: "Manutenção" },
        { value: "diarista", label: "Diarista" },
        { value: "reforma", label: "Reforma/Mobília" },
      ],
    },
    {
      value: "contas",
      label: "Contas",
      subcategorias: [
        { value: "luz", label: "Luz" },
        { value: "agua", label: "Água" },
        { value: "gas", label: "Gás" },
        { value: "internet", label: "Internet" },
        { value: "celular", label: "Celular" },
      ],
    },
    {
      value: "alimentacao",
      label: "Alimentação",
      subcategorias: [
        { value: "mercado", label: "Mercado" },
        { value: "padaria", label: "Padaria" },
        { value: "acougue", label: "Açougue" },
        { value: "restaurante", label: "Restaurante/Bar" },
        { value: "ifood", label: "iFood" },
        { value: "almoco-cafe", label: "Almoço/Café" },
      ],
    },
    {
      value: "transporte",
      label: "Transporte",
      subcategorias: [
        { value: "combustivel", label: "Combustível" },
        { value: "manutencao", label: "Manutenção/Revisão" },
        { value: "seguro", label: "Seguro" },
        { value: "ipva", label: "IPVA/Licenciamento" },
        { value: "estacionamento", label: "Estacionamento" },
        { value: "pedagio", label: "Pedágio" },
        { value: "uber", label: "Uber" },
        { value: "multas", label: "Multas" },
      ],
    },
    {
      value: "baby",
      label: "Baby",
      subcategorias: [
        { value: "roupas", label: "Roupas e Acessórios" },
        { value: "farmacia", label: "Farmácia" },
        { value: "brinquedos", label: "Brinquedos" },
      ],
    },
    {
      value: "educacao",
      label: "Educação",
      subcategorias: [
        { value: "cursos", label: "Cursos" },
        { value: "livros", label: "Livros" },
        { value: "material", label: "Material" },
      ],
    },
    {
      value: "saude",
      label: "Saúde/Higiene",
      subcategorias: [
        { value: "convenio", label: "Convênio" },
        { value: "farmacia", label: "Farmácia" },
        { value: "dentista", label: "Dentista" },
        { value: "exames", label: "Exames" },
        { value: "terapia", label: "Terapia" },
        { value: "academia", label: "Academia/Personal" },
        { value: "barbeiro-salao", label: "Barbeiro/Salão" },
        { value: "suplementos", label: "Suplementos" },
        { value: "oculista", label: "Óculos" },
      ],
    },
    {
      value: "lazer",
      label: "Lazer",
      subcategorias: [
        { value: "viagem", label: "Viagem" },
        { value: "shows-eventos", label: "Shows/Eventos" },
        { value: "cinema", label: "Cinema" },
        { value: "esportes", label: "Esportes" },
        { value: "outros", label: "Outros" },
      ],
    },
    {
      value: "pets",
      label: "Pets",
      subcategorias: [
        { value: "racao", label: "Ração" },
        { value: "veterinario", label: "Veterinário" },
        { value: "banho-tosa", label: "Banho e Tosa" },
        { value: "vacinas", label: "Vacinas" },
        { value: "farmacia", label: "Farmácia Pet" },
        { value: "acessorios", label: "Acessórios" },
        { value: "hotel-creche", label: "Hotel/Creche" },
      ],
    },
    {
      value: "assinaturas",
      label: "Assinaturas",
      subcategorias: [{ value: "assinatura", label: "Assinatura" }],
    },
    {
      value: "taxas-impostos",
      label: "Taxas/Impostos",
      subcategorias: [
        { value: "tarifas-bancarias", label: "Tarifas bancárias" },
        { value: "contador", label: "Contador" },
        { value: "sindicato", label: "Sindicato" },
        { value: "ir", label: "IR" },
      ],
    },
    {
      value: "outros",
      label: "Outros",
      subcategorias: [
        { value: "presentes", label: "Presentes" },
        { value: "roupas", label: "Roupas" },
        { value: "papelaria", label: "Papelaria" },
        { value: "gadgets", label: "Gadgets" },
        { value: "advogado", label: "Advogado" },
        { value: "diversos", label: "Diversos" },
      ],
    },
  ],
  investimento: [
    {
      value: "reserva-bebe",
      label: "Reserva do bebê",
      subcategorias: [
        { value: "aporte", label: "Aporte mensal" },
        { value: "presente-doacao", label: "Presente/Doação" },
        { value: "rendimento", label: "Rendimento" },
      ],
    },
    {
      value: "reserva-emergencia",
      label: "Reserva/Emergência",
      subcategorias: [
        { value: "aporte", label: "Aporte mensal" },
        { value: "rendimento", label: "Rendimento" },
      ],
    },
    {
      value: "previdencia",
      label: "Previdência",
      subcategorias: [
        { value: "aporte", label: "Aporte mensal" },
        { value: "rendimento", label: "Rendimento" },
      ],
    },
    {
      value: "acoes",
      label: "Ações/Renda Variável",
      subcategorias: [
        { value: "aporte", label: "Aporte" },
        { value: "rendimento", label: "Rendimento" },
      ],
    },
  ],
};

export const RESERVA_BEBE_CATEGORIA = "reserva-bebe";

export const TIPO_LABELS: Record<Tipo, string> = {
  entrada: "Entrada",
  saida: "Saída",
  investimento: "Investimento",
};

export function categoriasDoTipo(tipo: Tipo): CategoriaOption[] {
  return CATEGORIAS[tipo];
}

export function categoriaLabel(tipo: Tipo, categoria: string): string {
  return CATEGORIAS[tipo].find((c) => c.value === categoria)?.label ?? categoria;
}

export function subcategoriasDaCategoria(tipo: Tipo, categoria: string): SubcategoriaOption[] {
  return CATEGORIAS[tipo].find((c) => c.value === categoria)?.subcategorias ?? [];
}

export function subcategoriaLabel(tipo: Tipo, categoria: string, subcategoria: string): string {
  return (
    subcategoriasDaCategoria(tipo, categoria).find((s) => s.value === subcategoria)?.label ??
    subcategoria
  );
}

export interface Entry {
  id: string;
  date: string;
  tipo: Tipo;
  categoria: string;
  subcategoria: string;
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
