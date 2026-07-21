"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { personNameFor } from "@/lib/allowlist";
import { fetchChatConversas, fetchChatMensagens } from "@/lib/data";
import type { ChatConversa, ChatMensagem, NewEntry } from "@/lib/types";
import type { LancamentoProposto } from "@/lib/chat-shared";

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

// Confirma uma proposta de lançamento gerada pelo assistente (chat) — só
// depois que o usuário clica em "Confirmar" no cartão exibido. Igual ao
// addEntry do formulário de Lançar, mas sem redirect (aqui quem chama é o
// próprio widget de chat, que pode estar aberto em cima de qualquer página).
export async function confirmarLancamentoChat(
  proposta: LancamentoProposto,
): Promise<{ error?: string }> {
  const { supabase, autor } = await currentAuthor();

  const entry: NewEntry = {
    tipo: proposta.tipo,
    categoria: proposta.categoria,
    subcategoria: proposta.subcategoria,
    valor: proposta.valor,
    descricao: proposta.descricao,
    date: proposta.date,
    autor,
    goal_id: null,
    cartao_id: null,
  };

  const { error } = await supabase.from("entries").insert(entry);
  if (error) return { error: error.message };

  revalidatePath("/dashboard");
  revalidatePath("/historico");
  return {};
}
