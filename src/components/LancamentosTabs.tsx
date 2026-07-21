import Link from "next/link";

export function LancamentosTabs({ ativa }: { ativa: "novo" | "historico" }) {
  return (
    <div className="section-tabs">
      <Link href="/lancar" className={ativa === "novo" ? "active" : ""}>
        Novo lançamento
      </Link>
      <Link href="/historico" className={ativa === "historico" ? "active" : ""}>
        Histórico
      </Link>
    </div>
  );
}
