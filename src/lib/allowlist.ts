// Ajuste os nomes de exibição de cada pessoa conforme preferir.
export const PERSON_NAMES: Record<string, string> = {
  "bergg.pinheiro@gmail.com": "Berg",
  "gnogueiradias@gmail.com": "Gabi",
};

export const ALLOWED_EMAILS = Object.keys(PERSON_NAMES);

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

export function personNameFor(email: string | null | undefined): string {
  if (!email) return "Desconhecido";
  return PERSON_NAMES[email.toLowerCase()] ?? email;
}
