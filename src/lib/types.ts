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
      value: "meta",
      label: "Meta",
      subcategorias: [
        { value: "aporte", label: "Aporte mensal" },
        { value: "presente-doacao", label: "Presente/Doação" },
        { value: "rendimento", label: "Rendimento" },
      ],
    },
  ],
};

// Todo lançamento de investimento usa essa categoria — a meta específica
// (Reserva do bebê, Viagem, etc.) é identificada por goal_id, não mais por categoria.
export const META_CATEGORIA = "meta";

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
  goal_id: string | null;
  cartao_id: string | null;
  dividido: boolean;
  created_at: string;
}

export type NewEntry = Omit<Entry, "id" | "created_at">;

// Uma meta é qualquer objetivo de investimento/reserva criado pelo casal
// (reserva do bebê, viagem, etc.). A reserva do bebê original é marcada com
// especial_bebe=true para manter a ilustração do ninho — identificada por
// flag, não por nome, então pode ser renomeada livremente.
export interface Goal {
  id: string;
  nome: string;
  valor_meta: number | null;
  data_inicio: string | null;
  data_alvo: string | null;
  especial_bebe: boolean;
  especial_emergencia: boolean;
  created_at: string;
}

export type NewGoal = Omit<Goal, "id" | "created_at">;

// Cartão de crédito: fatura calculada a partir de dia_fechamento/
// dia_vencimento (ver src/lib/cartoes.ts), nunca armazenada. limite é só
// informativo (exibido na tela do cartão, sem alerta de estouro).
export interface Cartao {
  id: string;
  nome: string;
  banco: string | null;
  bandeira: string | null;
  limite: number | null;
  dia_fechamento: number;
  dia_vencimento: number;
  pessoa: string | null;
  created_at: string;
}

export const BANDEIRAS = ["Visa", "Mastercard", "Elo", "American Express", "Outro"] as const;

export type NewCartao = Omit<Cartao, "id" | "created_at">;

// Financiamento/dívida com parcela de valor fixo (sem cálculo de juros).
// A parcela vira item automático do checklist (dia_vencimento) e,
// diferente do cartão, confirmá-la cria um lançamento de saída de verdade
// (ver src/lib/actions.ts: syncFinanciamentoChecklistItem), usando
// categoria/subcategoria escolhidas na criação.
export interface Financiamento {
  id: string;
  nome: string;
  valor_parcela: number;
  numero_parcelas: number;
  dia_vencimento: number;
  categoria: string;
  subcategoria: string;
  pessoa: string | null;
  created_at: string;
}

export type NewFinanciamento = Omit<Financiamento, "id" | "created_at">;

export type TipoChecklistItem = "a_pagar" | "a_receber";

// Item recorrente do checklist mensal: uma conta a pagar (a_pagar) ou uma
// entrada a confirmar (a_receber). Sempre que categoria/subcategoria estão
// preenchidas, confirmar o item cria um lançamento real (entrada ou saída
// conforme `tipo`) usando esses valores — ver actions.ts:
// confirmarChecklistItem/desconfirmarChecklistItem. Itens a_receber com
// origem_profile_id são sincronizados a partir do salário cadastrado no
// Perfil (ver syncSalarioChecklistItems). Itens a_pagar com
// origem_cartao_id são sincronizados a partir do vencimento do cartão (ver
// syncCartaoChecklistItem) — esses NUNCA confirmam lançamento (o valor
// exibido é calculado ao vivo a partir das compras da fatura, ver
// src/lib/cartoes.ts: faturaQueVenceEm). A conclusão de cada item é
// rastreada por mês em ChecklistStatus, então o mesmo item "desmarca"
// automaticamente no mês seguinte.
export interface ChecklistItem {
  id: string;
  nome: string;
  valor_esperado: number | null;
  dia_vencimento: number | null;
  ativo: boolean;
  tipo: TipoChecklistItem;
  origem_profile_id: string | null;
  origem_parcela: number | null;
  origem_cartao_id: string | null;
  origem_financiamento_id: string | null;
  categoria: string | null;
  subcategoria: string | null;
  pessoa: string | null;
  created_at: string;
}

export type NewChecklistItem = Omit<
  ChecklistItem,
  | "id"
  | "created_at"
  | "ativo"
  | "tipo"
  | "origem_profile_id"
  | "origem_parcela"
  | "origem_cartao_id"
  | "origem_financiamento_id"
>;

export interface ChecklistStatus {
  id: string;
  item_id: string;
  mes: string;
  concluido: boolean;
  concluido_em: string | null;
  entry_id: string | null;
}

export type TipoSalario = "mensal" | "quinzenal";

// Dados default de cada pessoa. O salário é tratado como fluxo recorrente
// e futuro de entrada — usado no planejamento (Calendário e fluxo de
// caixa), não somado aos totais reais do Painel para não misturar
// dinheiro projetado com dinheiro já lançado. Pode ser mensal (uma
// parcela) ou quinzenal (duas parcelas em dias diferentes do mês).
export interface Profile {
  id: string;
  email: string;
  nome: string | null;
  sobrenome: string | null;
  telefone: string | null;
  tipo_salario: TipoSalario;
  salario_valor_1: number | null;
  salario_dia_1: number | null;
  salario_valor_2: number | null;
  salario_dia_2: number | null;
  created_at: string;
  updated_at: string;
}

export interface SalarioParcela {
  valor: number;
  dia: number;
}

export function salarioParcelas(p: Profile): SalarioParcela[] {
  const parcelas: SalarioParcela[] = [];
  if (p.salario_valor_1 && p.salario_dia_1) {
    parcelas.push({ valor: Number(p.salario_valor_1), dia: p.salario_dia_1 });
  }
  if (p.tipo_salario === "quinzenal" && p.salario_valor_2 && p.salario_dia_2) {
    parcelas.push({ valor: Number(p.salario_valor_2), dia: p.salario_dia_2 });
  }
  return parcelas;
}

export function salarioTotal(p: Profile): number {
  return salarioParcelas(p).reduce((sum, parcela) => sum + parcela.valor, 0);
}

// Limite mensal de gasto por pessoa/categoria (categoria sempre do tipo
// "saida"). Pode ser criado manualmente ou aceito a partir de uma sugestão
// da IA (ver src/lib/insights.ts: suggestBudgetLimits) — a IA nunca salva
// direto, só devolve valores pra revisão.
export interface BudgetLimit {
  id: string;
  autor: string;
  categoria: string;
  limite_mensal: number;
  created_at: string;
  updated_at: string;
}

export type NewBudgetLimit = Pick<BudgetLimit, "autor" | "categoria" | "limite_mensal">;

// Conversa com o assistente financeiro (bolhão flutuante). Agrupada por dia
// (`dia`), com um `tema` curto gerado pela IA na primeira troca de
// mensagens (ver src/lib/chat.ts: enviarMensagemChat).
export interface ChatConversa {
  id: string;
  autor: string;
  tema: string;
  dia: string;
  created_at: string;
  updated_at: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMensagem {
  id: string;
  conversa_id: string;
  role: ChatRole;
  content: string;
  created_at: string;
}

// Assinatura de push de um navegador/dispositivo em que alguém ativou os
// lembretes (ver src/lib/push.ts e src/app/api/cron/lembretes).
export interface PushSubscriptionRecord {
  id: string;
  autor: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

// Conexão entre dois perfis (um convida, o outro aceita). Fase 1: só o
// estado — a visibilidade dos dados ainda não depende disso (ver
// src/lib/conexoes.ts e supabase/migrations/019_conexoes.sql).
export type StatusConexao = "pendente" | "aceita" | "recusada" | "desconectada";

export interface Conexao {
  id: string;
  solicitante_email: string;
  convidado_email: string;
  status: StatusConexao;
  created_at: string;
  updated_at: string;
}
