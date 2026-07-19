"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { personNameFor } from "@/lib/allowlist";
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

  const entry: NewEntry = {
    tipo: formData.get("tipo") as Tipo,
    categoria: formData.get("categoria") as string,
    subcategoria: formData.get("subcategoria") as string,
    valor: Number(formData.get("valor")),
    descricao: (formData.get("descricao") as string) || null,
    date: formData.get("date") as string,
    autor,
  };

  const { error } = await supabase.from("entries").insert(entry);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/historico");
  revalidatePath("/reserva-bebe");
  redirect("/historico");
}

export async function saveImportedEntries(entries: NewEntry[]) {
  const { supabase, autor } = await currentAuthor();

  const rows = entries.map((entry) => ({ ...entry, autor: entry.autor || autor }));
  const { error } = await supabase.from("entries").insert(rows);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/historico");
  revalidatePath("/reserva-bebe");
}

export async function deleteEntry(id: string) {
  const { supabase } = await currentAuthor();
  const { error } = await supabase.from("entries").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/historico");
  revalidatePath("/reserva-bebe");
}

export async function updateGoal(formData: FormData) {
  const { supabase } = await currentAuthor();
  const metaBebe = Number(formData.get("meta_bebe"));

  const { error } = await supabase
    .from("settings")
    .update({ meta_bebe: metaBebe })
    .eq("id", 1);
  if (error) throw new Error(error.message);

  revalidatePath("/reserva-bebe");
  revalidatePath("/dashboard");
}
