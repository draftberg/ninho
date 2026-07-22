import { formatBRL } from "@/lib/format";
import type { MonthColumn } from "@/lib/cashflow";

export function CashFlowTable({ columns }: { columns: MonthColumn[] }) {
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
          <tr className="cashflow-row-strong">
            <td>Total de entrada</td>
            {columns.map((c) => (
              <td key={c.key} className="mono entrada">
                {formatBRL(c.totalEntrada)}
              </td>
            ))}
          </tr>
          <tr className="cashflow-row-strong">
            <td>Total de saída</td>
            {columns.map((c) => (
              <td key={c.key} className="mono saida">
                -{formatBRL(c.totalSaida)}
              </td>
            ))}
          </tr>
          <tr className="cashflow-row-strong">
            <td>Saldo mensal</td>
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
