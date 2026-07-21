import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { personNameFor } from "@/lib/allowlist";
import { Sidebar } from "@/components/Sidebar";
import { ChatWidget } from "@/components/ChatWidget";
import {
  fetchAllEntries,
  fetchGoals,
  fetchChecklistItems,
  fetchProfiles,
  fetchBudgetLimits,
} from "@/lib/data";
import { computeAlertas } from "@/lib/chat-alerts";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [entries, goals, checklistItems, profiles, budgetLimits] = await Promise.all([
    fetchAllEntries(supabase),
    fetchGoals(supabase),
    fetchChecklistItems(supabase),
    fetchProfiles(supabase),
    fetchBudgetLimits(supabase),
  ]);
  const alerts = computeAlertas(entries, goals, checklistItems, profiles, budgetLimits);

  return (
    <div className="app-shell">
      <Sidebar userName={personNameFor(user.email)} />
      <main className="app-main">{children}</main>
      <ChatWidget alerts={alerts} />
    </div>
  );
}
