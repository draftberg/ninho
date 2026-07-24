import { createClient } from "@/lib/supabase/server";
import { fetchGoals } from "@/lib/data";
import { LancamentosTabs } from "@/components/LancamentosTabs";
import { ImportarExtratoClient } from "./ImportarExtratoClient";

export default async function ImportarExtratoPage() {
  const supabase = await createClient();
  const goals = await fetchGoals(supabase);

  return (
    <div>
      <h2 className="section-title">Lançamentos</h2>
      <LancamentosTabs ativa="importar" />
      <p style={{ margin: "1rem 0", color: "#6e7a76" }}>
        Envie um PDF, foto, CSV ou TXT do extrato. A IA extrai e categoriza cada transação — revise
        antes de salvar.
      </p>
      <ImportarExtratoClient goals={goals} />
    </div>
  );
}
