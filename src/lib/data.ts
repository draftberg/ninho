import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entry, Goal } from "@/lib/types";

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
