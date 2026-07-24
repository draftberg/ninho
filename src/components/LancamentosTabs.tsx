import Link from "next/link";

export function LancamentosTabs({ ativa }: { ativa: "novo" | "historico" | "importar" }) {
  return (
    <div className="section-tabs">
      <Link href="/lancar" className={ativa === "novo" ? "active" : ""}>
        Novo lançamento
      </Link>
      <Link href="/historico" className={ativa === "historico" ? "active" : ""}>
        Histórico
      </Link>
      <Link href="/importar-extrato" className={ativa === "importar" ? "active" : ""}>
        Importar
      </Link>
    </div>
  );
}
