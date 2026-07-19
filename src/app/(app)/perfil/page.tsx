import { createClient } from "@/lib/supabase/server";
import { fetchProfiles } from "@/lib/data";
import { formatBRL } from "@/lib/format";
import { salarioParcelas } from "@/lib/types";
import { personColorClass, personNameFor } from "@/lib/allowlist";
import { ProfileForm } from "./ProfileForm";

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const profiles = await fetchProfiles(supabase);
  const email = user?.email ?? "";
  const own = profiles.find((p) => p.email.toLowerCase() === email.toLowerCase()) ?? null;
  const partner = profiles.find((p) => p.email.toLowerCase() !== email.toLowerCase()) ?? null;
  const partnerParcelas = partner ? salarioParcelas(partner) : [];

  return (
    <div>
      <h2 className="section-title">Perfil</h2>
      <ProfileForm email={email} profile={own} />

      {partner && (
        <div className="card partner-card">
          <h3 className={personColorClass(personNameFor(partner.email))}>
            {personNameFor(partner.email)}
          </h3>
          <p className="entry-meta">
            {[partner.nome, partner.sobrenome].filter(Boolean).join(" ") || "Sem dados cadastrados"}
          </p>
          {partnerParcelas.length > 0 && (
            <p className="entry-meta">
              Salário ({partner.tipo_salario}):{" "}
              {partnerParcelas
                .map((p) => `${formatBRL(p.valor)} (dia ${p.dia})`)
                .join(" + ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
