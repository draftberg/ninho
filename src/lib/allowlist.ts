// Ajuste os nomes de exibição de cada pessoa conforme preferir.
export const PERSON_NAMES: Record<string, string> = {
  "bergg.pinheiro@gmail.com": "Berg",
  "gnogueiradias@gmail.com": "Gabi",
};

// Cor de identidade de cada pessoa (usada em avatares e na visão "por pessoa").
// A chave é o nome de exibição (o mesmo valor salvo em entries.autor).
export const PERSON_COLOR_CLASS: Record<string, string> = {
  Berg: "pessoa-berg",
  Gabi: "pessoa-gabi",
};
const DEFAULT_PERSON_COLOR_CLASS = "pessoa-outro";

// Mesmas cores de PERSON_COLOR_CLASS, em hex — para uso em <canvas> (Chart.js),
// que não enxerga variáveis CSS.
export const PERSON_COLOR_HEX: Record<string, string> = {
  Berg: "#3e6b8a",
  Gabi: "#b85c7a",
};
const DEFAULT_PERSON_COLOR_HEX = "#6e7a76";

export function personColorHex(autor: string): string {
  return PERSON_COLOR_HEX[autor] ?? DEFAULT_PERSON_COLOR_HEX;
}

export const ALLOWED_EMAILS = Object.keys(PERSON_NAMES);

export const PERSON_DISPLAY_NAMES = Array.from(new Set(Object.values(PERSON_NAMES)));

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return ALLOWED_EMAILS.includes(email.toLowerCase());
}

export function personNameFor(email: string | null | undefined): string {
  if (!email) return "Desconhecido";
  return PERSON_NAMES[email.toLowerCase()] ?? email;
}

export function personColorClass(autor: string): string {
  return PERSON_COLOR_CLASS[autor] ?? DEFAULT_PERSON_COLOR_CLASS;
}

export function personInitial(autor: string): string {
  return autor.trim().charAt(0).toUpperCase() || "?";
}
