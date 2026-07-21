import { createClient } from "@/lib/supabase/server";
import { fetchGoals, fetchCartoes } from "@/lib/data";
import { personNameFor } from "@/lib/allowlist";
import { outroAutor } from "@/lib/divisao";
import { EntryForm } from "./EntryForm";
import { LancamentosTabs } from "@/components/LancamentosTabs";

export default async function LancarPage() {
  const supabase = await createClient();
  const [goals, cartoes] = await Promise.all([fetchGoals(supabase), fetchCartoes(supabase)]);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const outroNome = outroAutor(personNameFor(user?.email));

  return (
    <div>
      <h2 className="section-title">Lançamentos</h2>
      <LancamentosTabs ativa="novo" />
      <EntryForm goals={goals} cartoes={cartoes} outroNome={outroNome} />
    </div>
  );
}
