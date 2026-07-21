// Ilustração puramente visual — nunca mostra número de cartão real (o app
// não guarda esse dado), só o essencial pra identificar o cartão de longe:
// banco, nome e bandeira.
export function CartaoMockup({
  nome,
  banco,
  bandeira,
}: {
  nome: string;
  banco: string;
  bandeira: string;
}) {
  return (
    <div className="cartao-mockup">
      <span className="cartao-mockup-banco">{banco || "Banco"}</span>
      <span className="cartao-mockup-nome">{nome || "Nome do cartão"}</span>
      <span className="cartao-mockup-bandeira">{bandeira || "—"}</span>
    </div>
  );
}
