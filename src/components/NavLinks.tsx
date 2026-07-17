"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Painel" },
  { href: "/lancar", label: "Lançar" },
  { href: "/historico", label: "Histórico" },
  { href: "/reserva-bebe", label: "Reserva" },
  { href: "/importar-extrato", label: "Importar" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="app-nav">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={pathname.startsWith(link.href) ? "active" : ""}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
