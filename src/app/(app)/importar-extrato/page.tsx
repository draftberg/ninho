import { createClient } from "@/lib/supabase/server";
import { fetchGoals } from "@/lib/data";
import { ImportarExtratoClient } from "./ImportarExtratoClient";

export default async function ImportarExtratoPage() {
  const supabase = await createClient();
  const goals = await fetchGoals(supabase);

  return (
    <div>
      <h2 className="section-title">Importar extrato</h2>
      <p style={{ marginBottom: "1rem", color: "#6e7a76" }}>
        Envie um PDF, CSV ou TXT do extrato. A IA extrai e categoriza cada transação — revise antes
        de salvar.
      </p>
      <ImportarExtratoClient goals={goals} />
    </div>
  );
}
