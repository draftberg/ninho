import { createClient } from "@/lib/supabase/server";
import { fetchGoals } from "@/lib/data";
import { EntryForm } from "./EntryForm";

export default async function LancarPage() {
  const supabase = await createClient();
  const goals = await fetchGoals(supabase);

  return (
    <div>
      <h2 className="section-title">Novo lançamento</h2>
      <EntryForm goals={goals} />
    </div>
  );
}
