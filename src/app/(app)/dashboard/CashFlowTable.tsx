import { formatBRL } from "@/lib/format";
import type { MonthColumn } from "@/lib/cashflow";

export function CashFlowTable({ columns }: { columns: MonthColumn[] }) {
  const categoriaRows = Array.from(
    new Set(columns.flatMap((c) => c.entradasPorCategoria.map((e) => e.categoria))),
  );

  function valorDaCategoria(col: MonthColumn, categoria: string): number {
    return col.entradasPorCategoria.find((e) => e.categoria === categoria)?.valor ?? 0;
  }

  return (
    <div className="cashflow-wrap">
      <table className="cashflow-table">
        <thead>
          <tr>
            <th></th>
            {columns.map((c) => (
              <th key={c.key} className={c.projetado ? "projetado" : ""}>
                {c.label}
                {c.projetado && <span className="cashflow-badge">previsto</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Saldo anterior</td>
            {columns.map((c) => (
              <td key={c.key} className="mono">
                {formatBRL(c.saldoAnterior)}
              </td>
            ))}
          </tr>

          {categoriaRows.map((cat) => (
            <tr key={cat} className="cashflow-row-muted">
              <td>{cat}</td>
              {columns.map((c) => {
                const v = valorDaCategoria(c, cat);
                return (
                  <td key={c.key} className="mono">
                    {v > 0 ? formatBRL(v) : "—"}
                  </td>
                );
              })}
            </tr>
          ))}

          <tr className="cashflow-row-strong">
            <td>Ganhos do mês</td>
            {columns.map((c) => (
              <td key={c.key} className="mono entrada">
                {formatBRL(c.totalEntrada)}
              </td>
            ))}
          </tr>
          <tr className="cashflow-row-strong">
            <td>Total gastos</td>
            {columns.map((c) => (
              <td key={c.key} className="mono saida">
                -{formatBRL(c.totalSaida)}
              </td>
            ))}
          </tr>
          <tr className="cashflow-row-muted">
            <td>Investido</td>
            {columns.map((c) => (
              <td key={c.key} className="mono">
                {c.totalInvestimento > 0 ? `-${formatBRL(c.totalInvestimento)}` : "—"}
              </td>
            ))}
          </tr>

          <tr className="cashflow-row-strong">
            <td>Saldo do mês</td>
            {columns.map((c) => (
              <td key={c.key} className={`mono ${c.saldoMes >= 0 ? "saldo-positivo" : "saldo-negativo"}`}>
                {formatBRL(c.saldoMes)}
              </td>
            ))}
          </tr>
          <tr className="cashflow-row-total">
            <td>Saldo acumulado</td>
            {columns.map((c) => (
              <td
                key={c.key}
                className={`mono ${c.saldoAcumulado >= 0 ? "saldo-positivo" : "saldo-negativo"}`}
              >
                {formatBRL(c.saldoAcumulado)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
