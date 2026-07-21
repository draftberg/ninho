import type { SupabaseClient } from "@supabase/supabase-js";
import type { BudgetLimit, Cartao, ChecklistItem, ChecklistStatus, Entry, Goal, Profile } from "@/lib/types";

export async function fetchAllEntries(supabase: SupabaseClient): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Entry[];
}

export async function fetchGoals(supabase: SupabaseClient): Promise<Goal[]> {
  const { data, error } = await supabase
    .from("goals")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Goal[];
}

export async function fetchChecklistItems(supabase: SupabaseClient): Promise<ChecklistItem[]> {
  const { data, error } = await supabase
    .from("checklist_items")
    .select("*")
    .eq("ativo", true)
    .order("dia_vencimento", { ascending: true, nullsFirst: false })
    .order("nome", { ascending: true });

  if (error) throw error;
  return data as ChecklistItem[];
}

export async function fetchChecklistStatus(
  supabase: SupabaseClient,
  mes: string,
): Promise<ChecklistStatus[]> {
  const { data, error } = await supabase.from("checklist_status").select("*").eq("mes", mes);
  if (error) throw error;
  return data as ChecklistStatus[];
}

export async function fetchProfiles(supabase: SupabaseClient): Promise<Profile[]> {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw error;
  return data as Profile[];
}

export async function fetchBudgetLimits(supabase: SupabaseClient): Promise<BudgetLimit[]> {
  const { data, error } = await supabase
    .from("budget_limits")
    .select("*")
    .order("autor", { ascending: true })
    .order("categoria", { ascending: true });

  if (error) throw error;
  return data as BudgetLimit[];
}

export async function fetchCartoes(supabase: SupabaseClient): Promise<Cartao[]> {
  const { data, error } = await supabase
    .from("cartoes")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data as Cartao[];
}
