import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import {
  fetchAllEntries,
  fetchGoals,
  fetchChecklistItems,
  fetchProfiles,
  fetchBudgetLimits,
  fetchChecklistStatus,
} from "@/lib/data";
import { computeAlertas, computeLembretesDoDia } from "@/lib/chat-alerts";

// Roda 1x por dia via Vercel Cron (ver vercel.json) — não tem sessão de
// usuário (ninguém está logado quando o cron dispara), então usa a service
// role key pra ler os dados direto, contornando o RLS que depende de
// auth.email(). Runtime padrão (nodejs): a lib web-push usa módulos nativos
// do Node, não é compatível com o Edge Runtime.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Não autorizado.", { status: 401 });
  }

  if (
    !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
    !process.env.VAPID_PRIVATE_KEY ||
    !process.env.VAPID_SUBJECT
  ) {
    return new Response("Chaves VAPID não configuradas no servidor.", { status: 500 });
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY,
  );

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);
  const mesAmanha = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, "0")}`;

  const [entries, goals, checklistItems, profiles, budgetLimits, statusAmanha, subscriptions] =
    await Promise.all([
      fetchAllEntries(supabase),
      fetchGoals(supabase),
      fetchChecklistItems(supabase),
      fetchProfiles(supabase),
      fetchBudgetLimits(supabase),
      fetchChecklistStatus(supabase, mesAmanha),
      supabase.from("push_subscriptions").select("*").then((r) => {
        if (r.error) throw new Error(r.error.message);
        return r.data;
      }),
    ]);

  const mensagens = [
    ...computeLembretesDoDia(checklistItems, statusAmanha),
    ...computeAlertas(entries, goals, checklistItems, profiles, budgetLimits),
  ];

  if (mensagens.length === 0 || subscriptions.length === 0) {
    return Response.json({ enviados: 0, alertas: mensagens.length });
  }

  const payload = JSON.stringify({
    title: "Ninho",
    body: mensagens.length === 1 ? mensagens[0] : `${mensagens.length} avisos: ${mensagens[0]}`,
    url: "/dashboard",
  });

  let enviados = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload,
        );
        enviados += 1;
      } catch (err) {
        const statusCode = err instanceof webpush.WebPushError ? err.statusCode : null;
        if (statusCode === 404 || statusCode === 410) {
          await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        } else {
          console.error("[cron/lembretes] falha ao enviar push:", err);
        }
      }
    }),
  );

  return Response.json({ enviados, alertas: mensagens.length });
}
