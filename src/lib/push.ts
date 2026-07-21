"use server";

import { createClient } from "@/lib/supabase/server";
import { personNameFor } from "@/lib/allowlist";

export interface PushSubscriptionJSON {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

// Salva (ou atualiza) a assinatura de push deste navegador — chamado depois
// que o usuário aceita a permissão de notificação em /perfil.
export async function salvarPushSubscription(subscription: PushSubscriptionJSON) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const autor = personNameFor(user?.email);

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      autor,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
}

// Remove a assinatura deste navegador — chamado ao desativar os lembretes.
export async function removerPushSubscription(endpoint: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
  if (error) throw new Error(error.message);
}
