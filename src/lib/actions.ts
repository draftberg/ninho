"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { personNameFor } from "@/lib/allowlist";
import { todayISO } from "@/lib/format";
import {
  subcategoriaLabel,
  type NewBudgetLimit,
  type NewCartao,
  type NewEntry,
  type NewFinanciamento,
  type Tipo,
  type TipoChecklistItem,
} from "@/lib/types";
import { parcelasPagas } from "@/lib/financiamentos";

async function currentAuthor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, autor: personNameFor(user?.email), email: user?.email ?? null };
}

export async function addEntry(formData: FormData) {
  const { supabase, autor } = await currentAuthor();

  const goalIdRaw = formData.get("goal_id") as string;
  const cartaoIdRaw = formData.get("cartao_id") as string;
  const recorrente = formData.get("recorrente") === "1";
  const tipo = formData.get("tipo") as Tipo;

  const entry: NewEntry = {
    tipo,
    categoria: formData.get("categoria") as string,
    subcategoria: formData.get("subcategoria") as string,
    valor: Number(formData.get("valor")),
    descricao: (formData.get("descricao") as string) || null,
    date: formData.get("date") as string,
    autor,
    goal_id: goalIdRaw || null,
    cartao_id: cartaoIdRaw || null,
    dividido: tipo === "saida" && formData.get("dividido") === "1",
  };

  const { data: inserted, error } = await supabase.from("entries").insert(entry).select().single();
  if (error) throw new Error(error.message);

  if (recorrente && (entry.tipo === "entrada" || entry.tipo === "saida")) {
    await criarItemRecorrente(supabase, entry, inserted.id);
  }

  revalidatePath("/dashboard");
  revalidatePath("/historico");
  revalidatePath("/reserva");
  redirect("/historico");
}

// Cria o item de checklist correspondente a uma saída/entrada marcada como
// "recorrente" no Lançar, e já confirma o mês do próprio lançamento (ele
// mesmo é a primeira ocorrência — nos meses seguintes, confirma-se via
// Checklist). Sempre cria um item novo: o toggle é pra configurar a
// recorrência uma vez, não pra repetir o lançamento de um mês existente.
async function criarItemRecorrente(
  supabase: Awaited<ReturnType<typeof createClient>>,
  entry: NewEntry,
  entryId: string,
) {
  const tipoChecklist: TipoChecklistItem = entry.tipo === "entrada" ? "a_receber" : "a_pagar";
  const dia = Number(entry.date.slice(8, 10));
  const nome = entry.descricao || subcategoriaLabel(entry.tipo, entry.categoria, entry.subcategoria);

  const { data: item, error: itemError } = await supabase
    .from("checklist_items")
    .insert({
      nome,
      valor_esperado: entry.valor,
      dia_vencimento: dia,
      tipo: tipoChecklist,
      categoria: entry.categoria,
      subcategoria: entry.subcategoria,
      pessoa: entry.autor,
    })
    .select()
    .single();
  if (itemError) throw new Error(itemError.message);

  const mes = entry.date.slice(0, 7);
  const { error: statusError } = await supabase.from("checklist_status").upsert(
    {
      item_id: item.id,
      mes,
      concluido: true,
      concluido_em: new Date().toISOString(),
      entry_id: entryId,
    },
    { onConflict: "item_id,mes" },
  );
  if (statusError) throw new Error(statusError.message);

  revalidatePath("/checklist");
  revalidatePath("/calendario");
}

export async function saveImportedEntries(entries: NewEntry[]) {
  const { supabase, autor } = await currentAuthor();

  const rows = entries.map((entry) => ({ ...entry, autor: entry.autor || autor }));
  const { error } = await supabase.from("entries").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/historico");
  revalidatePath("/reserva");
}

export async function deleteEntry(id: string) {
  const { supabase } = await currentAuthor();
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/historico");
  revalidatePath("/reserva");
}

// Edita um lançamento já existente — não mexe em autor (quem lançou
// continua o mesmo) nem em recorrente/checklist (isso só se configura na
// criação, pra não duplicar itens do checklist a cada edição).
export async function updateEntry(formData: FormData) {
  const { supabase } = await currentAuthor();
  const id = formData.get("id") as string;
  const goalIdRaw = formData.get("goal_id") as string;
  const cartaoIdRaw = formData.get("cartao_id") as string;
  const tipo = formData.get("tipo") as Tipo;

  const { error } = await supabase
    .from("entries")
    .update({
      tipo,
      categoria: formData.get("categoria") as string,
      subcategoria: formData.get("subcategoria") as string,
      valor: Number(formData.get("valor")),
      descricao: (formData.get("descricao") as string) || null,
      date: formData.get("date") as string,
      goal_id: goalIdRaw || null,
      cartao_id: cartaoIdRaw || null,
      dividido: tipo === "saida" && formData.get("dividido") === "1",
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/historico");
  revalidatePath("/reserva");
  revalidatePath("/cartoes");
}

export async function createGoal(formData: FormData) {
  const { supabase } = await currentAuthor();
  const nome = formData.get("nome") as string;
  const valorMetaRaw = formData.get("valor_meta") as string;
  const dataAlvoRaw = formData.get("data_alvo") as string;

  const { error } = await supabase.from("goals").insert({
    nome,
    valor_meta: valorMetaRaw ? Number(valorMetaRaw) : null,
    data_inicio: todayISO(),
    data_alvo: dataAlvoRaw || null,
    especial_bebe: false,
    especial_emergencia: false,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/reserva");
  revalidatePath("/lancar");
}

// Cria a meta "Reserva de emergência" marcada com especial_emergencia=true —
// sem formulário, só um botão, igual à reserva do bebê original: identificada
// por flag (não por nome), então pode ser renomeada livremente depois.
export async function criarReservaEmergencia() {
  const { supabase } = await currentAuthor();
  const { error } = await supabase.from("goals").insert({
    nome: "Reserva de emergência",
    valor_meta: null,
    data_inicio: todayISO(),
    data_alvo: null,
    especial_bebe: false,
    especial_emergencia: true,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/reserva");
  revalidatePath("/dashboard");
  revalidatePath("/lancar");
}

export async function updateGoalTarget(formData: FormData) {
  const { supabase } = await currentAuthor();
  const id = formData.get("id") as string;
  const valorMetaRaw = formData.get("valor_meta") as string;
  const dataAlvoRaw = formData.get("data_alvo") as string;

  const { error } = await supabase
    .from("goals")
    .update({
      valor_meta: valorMetaRaw ? Number(valorMetaRaw) : null,
      data_alvo: dataAlvoRaw || null,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/reserva");
  revalidatePath("/dashboard");
}

export async function deleteGoal(id: string) {
  const { supabase } = await currentAuthor();
  const { error } = await supabase.from("goals").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/reserva");
  revalidatePath("/dashboard");
  revalidatePath("/lancar");
}

// Sincroniza o vencimento do cartão como item "a_pagar" do checklist mensal.
// valor_esperado fica sempre null: o total da fatura é calculado ao vivo a
// partir das compras reais (ver src/lib/cartoes.ts: faturaQueVenceEm), não
// armazenado, já que uma fatura muda de mês a mês (diferente do salário).
async function syncCartaoChecklistItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  cartaoId: string,
  nome: string,
  diaVencimento: number,
  pessoa: string | null,
) {
  const { error } = await supabase.from("checklist_items").upsert(
    {
      nome: `Fatura — ${nome}`,
      valor_esperado: null,
      dia_vencimento: diaVencimento,
      tipo: "a_pagar",
      origem_cartao_id: cartaoId,
      pessoa,
    },
    { onConflict: "origem_cartao_id" },
  );
  if (error) throw new Error(error.message);
}

export async function createCartao(formData: FormData) {
  const { supabase } = await currentAuthor();
  const nome = formData.get("nome") as string;
  const banco = (formData.get("banco") as string) || null;
  const bandeira = (formData.get("bandeira") as string) || null;
  const limiteRaw = formData.get("limite") as string;
  const diaFechamento = Number(formData.get("dia_fechamento"));
  const diaVencimento = Number(formData.get("dia_vencimento"));
  const pessoa = (formData.get("pessoa") as string) || null;

  const cartao: NewCartao = {
    nome,
    banco,
    bandeira,
    limite: limiteRaw ? Number(limiteRaw) : null,
    dia_fechamento: diaFechamento,
    dia_vencimento: diaVencimento,
    pessoa,
  };

  const { data, error } = await supabase.from("cartoes").insert(cartao).select().single();
  if (error) throw new Error(error.message);

  await syncCartaoChecklistItem(supabase, data.id, nome, diaVencimento, pessoa);

  revalidatePath("/cartoes");
  revalidatePath("/lancar");
  revalidatePath("/checklist");
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
}

export async function updateCartao(formData: FormData) {
  const { supabase } = await currentAuthor();
  const id = formData.get("id") as string;
  const nome = formData.get("nome") as string;
  const banco = (formData.get("banco") as string) || null;
  const bandeira = (formData.get("bandeira") as string) || null;
  const limiteRaw = formData.get("limite") as string;
  const diaFechamento = Number(formData.get("dia_fechamento"));
  const diaVencimento = Number(formData.get("dia_vencimento"));
  const pessoa = (formData.get("pessoa") as string) || null;

  const { error } = await supabase
    .from("cartoes")
    .update({
      nome,
      banco,
      bandeira,
      limite: limiteRaw ? Number(limiteRaw) : null,
      dia_fechamento: diaFechamento,
      dia_vencimento: diaVencimento,
      pessoa,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await syncCartaoChecklistItem(supabase, id, nome, diaVencimento, pessoa);

  revalidatePath("/cartoes");
  revalidatePath("/checklist");
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
}

export async function deleteCartao(id: string) {
  const { supabase } = await currentAuthor();
  // apaga o cartão: o item de checklist some junto (cascade em
  // origem_cartao_id) e as saídas já lançadas continuam no Histórico com
  // cartao_id = null (on delete set null), igual deleteGoal.
  const { error } = await supabase.from("cartoes").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/cartoes");
  revalidatePath("/lancar");
  revalidatePath("/checklist");
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
  revalidatePath("/historico");
}

// Sincroniza a parcela do financiamento como item "a_pagar" do checklist
// mensal. Diferente do cartão, valor_esperado aqui é fixo (a parcela não
// varia) e categoria/subcategoria são preenchidas, então confirmar o item
// passa pelo mesmo fluxo já genérico de confirmarChecklistItem — cria um
// lançamento de saída de verdade.
async function syncFinanciamentoChecklistItem(
  supabase: Awaited<ReturnType<typeof createClient>>,
  financiamentoId: string,
  nome: string,
  diaVencimento: number,
  valorParcela: number,
  categoria: string,
  subcategoria: string,
  pessoa: string | null,
) {
  const { error } = await supabase.from("checklist_items").upsert(
    {
      nome: `Parcela — ${nome}`,
      valor_esperado: valorParcela,
      dia_vencimento: diaVencimento,
      tipo: "a_pagar",
      origem_financiamento_id: financiamentoId,
      categoria,
      subcategoria,
      pessoa,
    },
    { onConflict: "origem_financiamento_id" },
  );
  if (error) throw new Error(error.message);
}

export async function createFinanciamento(formData: FormData) {
  const { supabase } = await currentAuthor();
  const nome = formData.get("nome") as string;
  const valorParcela = Number(formData.get("valor_parcela"));
  const numeroParcelas = Number(formData.get("numero_parcelas"));
  const diaVencimento = Number(formData.get("dia_vencimento"));
  const categoria = formData.get("categoria") as string;
  const subcategoria = formData.get("subcategoria") as string;
  const pessoa = (formData.get("pessoa") as string) || null;

  const financiamento: NewFinanciamento = {
    nome,
    valor_parcela: valorParcela,
    numero_parcelas: numeroParcelas,
    dia_vencimento: diaVencimento,
    categoria,
    subcategoria,
    pessoa,
  };

  const { data, error } = await supabase
    .from("financiamentos")
    .insert(financiamento)
    .select()
    .single();
  if (error) throw new Error(error.message);

  await syncFinanciamentoChecklistItem(
    supabase,
    data.id,
    nome,
    diaVencimento,
    valorParcela,
    categoria,
    subcategoria,
    pessoa,
  );

  revalidatePath("/financiamentos");
  revalidatePath("/checklist");
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
}

export async function updateFinanciamento(formData: FormData) {
  const { supabase } = await currentAuthor();
  const id = formData.get("id") as string;
  const nome = formData.get("nome") as string;
  const valorParcela = Number(formData.get("valor_parcela"));
  const numeroParcelas = Number(formData.get("numero_parcelas"));
  const diaVencimento = Number(formData.get("dia_vencimento"));
  const categoria = formData.get("categoria") as string;
  const subcategoria = formData.get("subcategoria") as string;
  const pessoa = (formData.get("pessoa") as string) || null;

  const { error } = await supabase
    .from("financiamentos")
    .update({
      nome,
      valor_parcela: valorParcela,
      numero_parcelas: numeroParcelas,
      dia_vencimento: diaVencimento,
      categoria,
      subcategoria,
      pessoa,
    })
    .eq("id", id);
  if (error) throw new Error(error.message);

  await syncFinanciamentoChecklistItem(
    supabase,
    id,
    nome,
    diaVencimento,
    valorParcela,
    categoria,
    subcategoria,
    pessoa,
  );

  revalidatePath("/financiamentos");
  revalidatePath("/checklist");
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
}

export async function deleteFinanciamento(id: string) {
  const { supabase } = await currentAuthor();
  // apaga o financiamento: o item de checklist some junto (cascade em
  // origem_financiamento_id); as parcelas já pagas continuam no Histórico.
  const { error } = await supabase.from("financiamentos").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/financiamentos");
  revalidatePath("/checklist");
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
  revalidatePath("/historico");
}

export async function createChecklistItem(formData: FormData) {
  const { supabase } = await currentAuthor();
  const nome = formData.get("nome") as string;
  const valorEsperadoRaw = formData.get("valor_esperado") as string;
  const diaVencimentoRaw = formData.get("dia_vencimento") as string;
  const categoria = (formData.get("categoria") as string) || null;
  const subcategoria = (formData.get("subcategoria") as string) || null;
  const pessoa = (formData.get("pessoa") as string) || null;

  const { error } = await supabase.from("checklist_items").insert({
    nome,
    valor_esperado: valorEsperadoRaw ? Number(valorEsperadoRaw) : null,
    dia_vencimento: diaVencimentoRaw ? Number(diaVencimentoRaw) : null,
    categoria,
    subcategoria,
    pessoa,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}

// Atribui/corrige o dono de um item de checklist criado manualmente,
// direto da lista (sem precisar de uma tela de edição completa) — usado
// principalmente pra dar dono a contas cadastradas antes dessa coluna existir.
export async function updateChecklistItemPessoa(itemId: string, pessoa: string) {
  const { supabase } = await currentAuthor();
  const { error } = await supabase.from("checklist_items").update({ pessoa }).eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}

export async function deleteChecklistItem(id: string) {
  const { supabase } = await currentAuthor();
  const { error } = await supabase.from("checklist_items").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}

export async function toggleChecklistItem(itemId: string, mes: string, concluido: boolean) {
  const { supabase } = await currentAuthor();

  const { error } = await supabase
    .from("checklist_status")
    .upsert(
      { item_id: itemId, mes, concluido, concluido_em: concluido ? new Date().toISOString() : null },
      { onConflict: "item_id,mes" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}

export async function upsertProfile(formData: FormData) {
  const { supabase, email } = await currentAuthor();
  if (!email) throw new Error("Usuário não autenticado.");

  const nome = (formData.get("nome") as string) || null;
  const sobrenome = (formData.get("sobrenome") as string) || null;
  const telefone = (formData.get("telefone") as string) || null;
  const tipoSalario = formData.get("tipo_salario") === "quinzenal" ? "quinzenal" : "mensal";
  const valor1Raw = formData.get("salario_valor_1") as string;
  const dia1Raw = formData.get("salario_dia_1") as string;
  const valor2Raw = formData.get("salario_valor_2") as string;
  const dia2Raw = formData.get("salario_dia_2") as string;

  const valor1 = valor1Raw ? Number(valor1Raw) : null;
  const dia1 = dia1Raw ? Number(dia1Raw) : null;
  const valor2 = tipoSalario === "quinzenal" && valor2Raw ? Number(valor2Raw) : null;
  const dia2 = tipoSalario === "quinzenal" && dia2Raw ? Number(dia2Raw) : null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .upsert(
      {
        email,
        nome,
        sobrenome,
        telefone,
        tipo_salario: tipoSalario,
        salario_valor_1: valor1,
        salario_dia_1: dia1,
        salario_valor_2: valor2,
        salario_dia_2: dia2,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "email" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);

  await syncSalarioChecklistItems(supabase, profile.id, personNameFor(email), [
    { parcela: 1, valor: valor1, dia: dia1 },
    { parcela: 2, valor: valor2, dia: dia2 },
  ]);

  revalidatePath("/perfil");
  revalidatePath("/checklist");
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
}

// Apaga tudo que essa pessoa preencheu no app: lançamentos reais no
// Histórico, cartões/financiamentos/itens de checklist manuais dos quais é
// dona, metas de gasto, conversas do chat, inscrição de lembretes push e o
// perfil em si (nome/sobrenome/telefone/salário). Cartões e financiamentos
// derrubam junto seus itens de checklist sincronizados (cascade em
// origem_cartao_id/origem_financiamento_id), e o perfil derruba os itens de
// salário (origem_profile_id) — daí a ordem: primeiro os dados soltos,
// cartão/financiamento por último antes do perfil.
export async function resetProfile() {
  const { supabase, autor, email } = await currentAuthor();
  if (!email) throw new Error("Usuário não autenticado.");

  const { error: entriesError } = await supabase.from("entries").delete().eq("autor", autor);
  if (entriesError) throw new Error(entriesError.message);

  const { error: budgetError } = await supabase.from("budget_limits").delete().eq("autor", autor);
  if (budgetError) throw new Error(budgetError.message);

  const { error: chatError } = await supabase.from("chat_conversas").delete().eq("autor", autor);
  if (chatError) throw new Error(chatError.message);

  const { error: pushError } = await supabase.from("push_subscriptions").delete().eq("autor", autor);
  if (pushError) throw new Error(pushError.message);

  const { error: manualChecklistError } = await supabase
    .from("checklist_items")
    .delete()
    .eq("pessoa", autor)
    .is("origem_cartao_id", null)
    .is("origem_financiamento_id", null)
    .is("origem_profile_id", null);
  if (manualChecklistError) throw new Error(manualChecklistError.message);

  const { error: cartoesError } = await supabase.from("cartoes").delete().eq("pessoa", autor);
  if (cartoesError) throw new Error(cartoesError.message);

  const { error: financiamentosError } = await supabase
    .from("financiamentos")
    .delete()
    .eq("pessoa", autor);
  if (financiamentosError) throw new Error(financiamentosError.message);

  const { error } = await supabase.from("profiles").delete().eq("email", email);
  if (error) throw new Error(error.message);

  revalidatePath("/perfil");
  revalidatePath("/checklist");
  revalidatePath("/calendario");
  revalidatePath("/dashboard");
  revalidatePath("/historico");
  revalidatePath("/cartoes");
  revalidatePath("/financiamentos");
  revalidatePath("/orcamento");
}

export async function upsertBudgetLimits(rows: NewBudgetLimit[]) {
  if (rows.length === 0) return;
  const { supabase } = await currentAuthor();

  const { error } = await supabase.from("budget_limits").upsert(
    rows.map((row) => ({ ...row, updated_at: new Date().toISOString() })),
    { onConflict: "autor,categoria" },
  );
  if (error) throw new Error(error.message);

  revalidatePath("/orcamento");
  revalidatePath("/dashboard");
}

export async function deleteBudgetLimit(id: string) {
  const { supabase } = await currentAuthor();
  const { error } = await supabase.from("budget_limits").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/orcamento");
  revalidatePath("/dashboard");
}

async function syncSalarioChecklistItems(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profileId: string,
  autor: string,
  parcelas: { parcela: 1 | 2; valor: number | null; dia: number | null }[],
) {
  for (const { parcela, valor, dia } of parcelas) {
    if (valor && dia) {
      const { error } = await supabase.from("checklist_items").upsert(
        {
          nome: `Salário — ${autor}`,
          valor_esperado: valor,
          dia_vencimento: dia,
          tipo: "a_receber",
          categoria: "salario",
          subcategoria: "salario",
          origem_profile_id: profileId,
          origem_parcela: parcela,
          pessoa: autor,
        },
        { onConflict: "origem_profile_id,origem_parcela" },
      );
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("checklist_items")
        .delete()
        .eq("origem_profile_id", profileId)
        .eq("origem_parcela", parcela);
      if (error) throw new Error(error.message);
    }
  }
}

// Confirma um item do checklist (a_pagar ou a_receber) criando o lançamento
// real correspondente. Exige categoria/subcategoria definidas no item — sem
// elas não dá pra saber que tipo de lançamento gerar (ver
// createChecklistItem/syncSalarioChecklistItems/EntryForm: todo item passa
// a nascer com categoria, exceto os de cartão, que nunca confirmam
// lançamento porque as compras já existem como entries próprias).
export async function confirmarChecklistItem(itemId: string, mes: string, valor: number, date: string) {
  const { supabase, autor } = await currentAuthor();

  const { data: item, error: itemError } = await supabase
    .from("checklist_items")
    .select("tipo, categoria, subcategoria, origem_profile_id, origem_financiamento_id, pessoa")
    .eq("id", itemId)
    .single();
  if (itemError) throw new Error(itemError.message);
  if (!item.categoria || !item.subcategoria) {
    throw new Error("Este item não tem categoria definida — edite o cadastro antes de confirmar.");
  }

  // O lançamento real vai pro dono da conta (quem paga/recebe), não pra quem
  // clicou em confirmar — evita atribuir a fatura/parcela da outra pessoa
  // a quem só está registrando o pagamento.
  let entryAutor = item.pessoa ?? autor;
  if (item.origem_profile_id) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", item.origem_profile_id)
      .single();
    if (profileError) throw new Error(profileError.message);
    entryAutor = personNameFor(profile.email);
  }

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .insert({
      tipo: item.tipo === "a_receber" ? "entrada" : "saida",
      categoria: item.categoria,
      subcategoria: item.subcategoria,
      valor,
      descricao: null,
      date,
      autor: entryAutor,
      goal_id: null,
      cartao_id: null,
    })
    .select()
    .single();
  if (entryError) throw new Error(entryError.message);

  const { error: statusError } = await supabase.from("checklist_status").upsert(
    {
      item_id: itemId,
      mes,
      concluido: true,
      concluido_em: new Date().toISOString(),
      entry_id: entry.id,
    },
    { onConflict: "item_id,mes" },
  );
  if (statusError) throw new Error(statusError.message);

  // se essa era a última parcela do financiamento, desativa o item pra ele
  // parar de aparecer em meses futuros
  if (item.origem_financiamento_id) {
    const { data: financiamento, error: financiamentoError } = await supabase
      .from("financiamentos")
      .select("numero_parcelas")
      .eq("id", item.origem_financiamento_id)
      .single();
    if (financiamentoError) throw new Error(financiamentoError.message);

    const { data: statusConcluido, error: statusConcluidoError } = await supabase
      .from("checklist_status")
      .select("*")
      .eq("item_id", itemId)
      .eq("concluido", true);
    if (statusConcluidoError) throw new Error(statusConcluidoError.message);

    if (parcelasPagas(statusConcluido, itemId) >= financiamento.numero_parcelas) {
      const { error: ativoError } = await supabase
        .from("checklist_items")
        .update({ ativo: false })
        .eq("id", itemId);
      if (ativoError) throw new Error(ativoError.message);
    }
  }

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
  revalidatePath("/historico");
  revalidatePath("/calendario");
  revalidatePath("/financiamentos");
}

export async function desconfirmarChecklistItem(itemId: string, mes: string) {
  const { supabase } = await currentAuthor();

  const { data: status, error: statusError } = await supabase
    .from("checklist_status")
    .select("entry_id")
    .eq("item_id", itemId)
    .eq("mes", mes)
    .maybeSingle();
  if (statusError) throw new Error(statusError.message);

  if (status?.entry_id) {
    const { error: deleteError } = await supabase.from("entries").delete().eq("id", status.entry_id);
    if (deleteError) throw new Error(deleteError.message);
  }

  const { error } = await supabase
    .from("checklist_status")
    .upsert(
      { item_id: itemId, mes, concluido: false, concluido_em: null, entry_id: null },
      { onConflict: "item_id,mes" },
    );
  if (error) throw new Error(error.message);

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
  revalidatePath("/historico");
  revalidatePath("/calendario");
}
