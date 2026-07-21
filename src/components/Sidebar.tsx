"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SquaresFourIcon,
  PlusCircleIcon,
  ClockCounterClockwiseIcon,
  PiggyBankIcon,
  CreditCardIcon,
  ListChecksIcon,
  CalendarBlankIcon,
  UploadSimpleIcon,
  ChartPieSliceIcon,
  CaretLeftIcon,
  CaretRightIcon,
  SignOutIcon,
  BirdIcon,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/dashboard", label: "Painel", icon: SquaresFourIcon },
  { href: "/lancar", label: "Lançar", icon: PlusCircleIcon },
  { href: "/historico", label: "Histórico", icon: ClockCounterClockwiseIcon },
  { href: "/reserva", label: "Reserva", icon: PiggyBankIcon },
  { href: "/cartoes", label: "Cartões", icon: CreditCardIcon },
  { href: "/checklist", label: "Checklist", icon: ListChecksIcon },
  { href: "/orcamento", label: "Orçamento", icon: ChartPieSliceIcon },
  { href: "/calendario", label: "Calendário", icon: CalendarBlankIcon },
  { href: "/importar-extrato", label: "Importar", icon: UploadSimpleIcon },
];

const STORAGE_KEY = "ninho-sidebar-collapsed";

export function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // restaura a preferência salva no navegador (não dá pra ler no SSR, então
    // sincroniza logo após montar em vez de usar o estado inicial do useState)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
  }, []);

  function toggle() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
      <div className="sidebar-top">
        <div className="sidebar-brand">
          <span className="sidebar-brand-icon">
            <BirdIcon size={18} weight="fill" />
          </span>
          <span className="sidebar-label">Ninho</span>
        </div>
        <button
          type="button"
          className="sidebar-toggle"
          onClick={toggle}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <CaretRightIcon size={14} /> : <CaretLeftIcon size={14} />}
        </button>
      </div>

      <nav className="sidebar-nav">
        {LINKS.map((link) => {
          const Icon = link.icon;
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`sidebar-link${active ? " active" : ""}`}
              title={link.label}
            >
              <Icon size={19} weight={active ? "fill" : "regular"} />
              <span className="sidebar-label">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-bottom">
        <Link
          href="/perfil"
          className={`sidebar-user${pathname.startsWith("/perfil") ? " active" : ""}`}
          title="Perfil"
        >
          <span className="sidebar-user-avatar">{userName.charAt(0).toUpperCase()}</span>
          <span className="sidebar-label sidebar-user-name">{userName}</span>
        </Link>
        <button type="button" className="sidebar-link sidebar-logout" onClick={handleLogout} title="Sair">
          <SignOutIcon size={19} />
          <span className="sidebar-label">Sair</span>
        </button>
      </div>
    </aside>
  );
}
