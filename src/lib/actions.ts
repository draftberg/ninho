"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { personNameFor } from "@/lib/allowlist";
import { todayISO } from "@/lib/format";
import type { NewEntry, Tipo } from "@/lib/types";

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

  const entry: NewEntry = {
    tipo: formData.get("tipo") as Tipo,
    categoria: formData.get("categoria") as string,
    subcategoria: formData.get("subcategoria") as string,
    valor: Number(formData.get("valor")),
    descricao: (formData.get("descricao") as string) || null,
    date: formData.get("date") as string,
    autor,
    goal_id: goalIdRaw || null,
  };

  const { error } = await supabase.from("entries").insert(entry);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/historico");
  revalidatePath("/reserva");
  redirect("/historico");
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
  });
  if (error) throw new Error(error.message);

  revalidatePath("/reserva");
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

export async function createChecklistItem(formData: FormData) {
  const { supabase } = await currentAuthor();
  const nome = formData.get("nome") as string;
  const valorEsperadoRaw = formData.get("valor_esperado") as string;
  const diaVencimentoRaw = formData.get("dia_vencimento") as string;

  const { error } = await supabase.from("checklist_items").insert({
    nome,
    valor_esperado: valorEsperadoRaw ? Number(valorEsperadoRaw) : null,
    dia_vencimento: diaVencimentoRaw ? Number(diaVencimentoRaw) : null,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/checklist");
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
          origem_profile_id: profileId,
          origem_parcela: parcela,
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

export async function confirmarRenda(itemId: string, mes: string, valor: number, date: string) {
  const { supabase } = await currentAuthor();

  const { data: item, error: itemError } = await supabase
    .from("checklist_items")
    .select("origem_profile_id")
    .eq("id", itemId)
    .single();
  if (itemError) throw new Error(itemError.message);
  if (!item.origem_profile_id) throw new Error("Item não é uma entrada de salário.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", item.origem_profile_id)
    .single();
  if (profileError) throw new Error(profileError.message);

  const { data: entry, error: entryError } = await supabase
    .from("entries")
    .insert({
      tipo: "entrada",
      categoria: "salario",
      subcategoria: "salario",
      valor,
      descricao: "Salário confirmado",
      date,
      autor: personNameFor(profile.email),
      goal_id: null,
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

  revalidatePath("/checklist");
  revalidatePath("/dashboard");
  revalidatePath("/historico");
  revalidatePath("/calendario");
}

export async function desconfirmarRenda(itemId: string, mes: string) {
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
