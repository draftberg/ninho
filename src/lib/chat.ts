"use server";

import { createClient } from "@/lib/supabase/server";
import { personNameFor } from "@/lib/allowlist";
import { fetchChatConversas, fetchChatMensagens } from "@/lib/data";
import type { ChatConversa, ChatMensagem } from "@/lib/types";

async function currentAuthor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, autor: personNameFor(user?.email) };
}

export async function listarConversas(): Promise<ChatConversa[]> {
  const { supabase } = await currentAuthor();
  return fetchChatConversas(supabase);
}

export async function carregarMensagens(conversaId: string): Promise<ChatMensagem[]> {
  const { supabase } = await currentAuthor();
  return fetchChatMensagens(supabase, conversaId);
}

export async function deletarConversa(conversaId: string) {
  const { supabase } = await currentAuthor();
  const { error } = await supabase.from("chat_conversas").delete().eq("id", conversaId);
  if (error) throw new Error(error.message);
}
