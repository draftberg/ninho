import type { SupabaseClient } from "@supabase/supabase-js";
import type { Entry, Settings } from "@/lib/types";

export async function fetchAllEntries(supabase: SupabaseClient): Promise<Entry[]> {
  const { data, error } = await supabase
    .from("entries")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as Entry[];
}

export async function fetchSettings(supabase: SupabaseClient): Promise<Settings> {
  const { data, error } = await supabase.from("settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data as Settings;
}
