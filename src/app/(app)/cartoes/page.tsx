import { createClient } from "@/lib/supabase/server";
import { fetchAllEntries, fetchCartoes } from "@/lib/data";
import { entriesByCartao, faturaAberta, faturasDoCartao } from "@/lib/cartoes";
import { formatBRL, formatDate } from "@/lib/format";
import { categoriaLabel, type Cartao, type Entry } from "@/lib/types";
import { PersonAvatar } from "@/components/PersonAvatar";
import { CreditCardIcon } from "@phosphor-icons/react/dist/ssr";
import { EditCartaoForm } from "./EditCartaoForm";
import { CreateCartaoForm } from "./CreateCartaoForm";
import { ConfirmDeleteButton } from "@/components/ConfirmDeleteButton";
import { deleteCartao } from "@/lib/actions";
import Link from "next/link";

export default async function CartoesPage({
  searchParams,
}: {
  searchParams: Promise<{ cartao?: string }>;
}) {
  const { cartao: cartaoParam } = await searchParams;
  const supabase = await createClient();
  const [entries, cartoes] = await Promise.all([fetchAllEntries(supabase), fetchCartoes(supabase)]);

  const selectedCartao = cartoes.find((c) => c.id === cartaoParam) ?? cartoes[0];

  return (
    <div>
      <h2 className="section-title">Cartões</h2>

      <div className="goals-grid">
        {cartoes.map((cartao) => {
          const aberta = faturaAberta(entries, cartao);
          const active = selectedCartao?.id === cartao.id;
          return (
            <Link
              key={cartao.id}
              href={`/cartoes?cartao=${cartao.id}`}
              className={`goal-card${active ? " active" : ""}`}
            >
              <span className="goal-card-icon">
                <CreditCardIcon size={20} weight="fill" />
              </span>
              <span className="goal-card-name">{cartao.nome}</span>
              <span className="goal-card-valor">{formatBRL(aberta.total)}</span>
              <span className="goal-card-meta">Vence {formatDate(aberta.vencimento)}</span>
            </Link>
          );
        })}
        <CreateCartaoForm />
      </div>

      {cartoes.length === 0 && (
        <p className="empty-state">Nenhum cartão cadastrado ainda. Crie o primeiro acima.</p>
      )}

      {selectedCartao && <CartaoDetail cartao={selectedCartao} entries={entriesByCartao(entries, selectedCartao.id)} />}
    </div>
  );
}

function CartaoDetail({ cartao, entries }: { cartao: Cartao; entries: Entry[] }) {
  const aberta = faturaAberta(entries, cartao);
  const faturas = faturasDoCartao(entries, cartao);

  return (
    <div>
      <div className="nest-hero card">
        <CreditCardIcon size={64} weight="duotone" />
        <h2>{cartao.nome}</h2>
        {cartao.banco && <p className="entry-meta">{cartao.banco}</p>}
        <div className="kpi-value" style={{ color: "var(--color-gold)" }}>
          {formatBRL(aberta.total)}
        </div>
        <p>Fatura atual — vence {formatDate(aberta.vencimento)}</p>
        <p className="entry-meta">
          Fecha dia {cartao.dia_fechamento} · Vence dia {cartao.dia_vencimento}
          {cartao.limite != null && <> · Limite {formatBRL(cartao.limite)}</>}
        </p>
        <EditCartaoForm cartao={cartao} />
        <ConfirmDeleteButton
          label="Excluir cartão"
          title="Excluir cartão"
          description={`Isso apaga o cartão "${cartao.nome}" e o lembrete de vencimento no checklist. As compras já lançadas continuam no Histórico, mas deixam de contar para este cartão.`}
          onConfirm={deleteCartao.bind(null, cartao.id)}
          className="danger-outline-button"
        />
      </div>

      <div className="section-title" style={{ marginTop: "1.5rem" }}>
        Faturas
      </div>
      {faturas.length === 0 && <p className="empty-state">Nenhuma compra registrada ainda.</p>}
      {faturas.map((fatura) => (
        <div key={fatura.faturaKey} style={{ marginBottom: "1.25rem" }}>
          <div className="checklist-summary card">
            <span>Vence {formatDate(fatura.vencimento)}</span>
            <span className="mono">{formatBRL(fatura.total)}</span>
          </div>
          <div className="entry-list">
            {fatura.entries.map((entry) => (
              <div key={entry.id} className="entry-item">
                <div className="entry-row">
                  <PersonAvatar autor={entry.autor} />
                  <div className="entry-main">
                    <span className="entry-desc">
                      {entry.descricao || categoriaLabel("saida", entry.categoria)}
                    </span>
                    <span className="entry-meta">
                      {formatDate(entry.date)} · {entry.autor}
                    </span>
                  </div>
                </div>
                <span className="entry-valor saida">{formatBRL(entry.valor)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
