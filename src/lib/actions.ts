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
  return { supabase, autor: personNameFor(user?.email) };
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
