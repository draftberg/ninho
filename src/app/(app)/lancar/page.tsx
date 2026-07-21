import { createClient } from "@/lib/supabase/server";
import { fetchGoals, fetchCartoes } from "@/lib/data";
import { EntryForm } from "./EntryForm";

export default async function LancarPage() {
  const supabase = await createClient();
  const [goals, cartoes] = await Promise.all([fetchGoals(supabase), fetchCartoes(supabase)]);

  return (
    <div>
      <h2 className="section-title">Novo lançamento</h2>
      <EntryForm goals={goals} cartoes={cartoes} />
    </div>
  );
}
