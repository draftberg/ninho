export function formatBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(value: string): string {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export function monthLabel(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  const label = date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  return label.replace(".", "");
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function monthKeyOf(dateISO: string): string {
  return dateISO.slice(0, 7);
}
