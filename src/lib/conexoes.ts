"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail } from "@/lib/allowlist";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, email: user?.email?.toLowerCase() ?? null };
}

// Convida outro perfil pra conectar. App privado: só e-mails da allowlist
// podem ser convidados (o resto do produto ainda pressupõe o casal fixo).
export async function convidarParaConectar(emailConvidado: string): Promise<{ error?: string }> {
  const { supabase, email } = await currentUser();
  if (!email) return { error: "Usuário não autenticado." };

  const convidado = emailConvidado.trim().toLowerCase();
  if (!convidado) return { error: "Informe o e-mail de quem você quer convidar." };
  if (convidado === email) return { error: "Você não pode se conectar com você mesmo." };
  if (!isAllowedEmail(convidado)) return { error: "Esse e-mail ainda não tem acesso ao app." };

  const { error } = await supabase.from("conexoes").upsert(
    {
      solicitante_email: email,
      convidado_email: convidado,
      status: "pendente",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "solicitante_email,convidado_email" },
  );
  if (error) return { error: error.message };

  revalidatePath("/perfil");
  return {};
}

async function mudarStatusConexao(
  id: string,
  status: "aceita" | "recusada" | "desconectada",
): Promise<{ error?: string }> {
  const { supabase, email } = await currentUser();
  if (!email) return { error: "Usuário não autenticado." };

  const { error } = await supabase
    .from("conexoes")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/perfil");
  revalidatePath("/dashboard");
  return {};
}

export async function aceitarConexao(id: string) {
  return mudarStatusConexao(id, "aceita");
}

export async function recusarConexao(id: string) {
  return mudarStatusConexao(id, "recusada");
}

// Fase 1: só registra o estado — a visibilidade dos dados ainda não depende
// da conexão (isso entra na Fase 2). A UI deixa isso claro.
export async function desconectar(id: string) {
  return mudarStatusConexao(id, "desconectada");
}
