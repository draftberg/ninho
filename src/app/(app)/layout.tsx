import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { personNameFor } from "@/lib/allowlist";
import { LogoutButton } from "@/components/LogoutButton";
import { NavLinks } from "@/components/NavLinks";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="brand">Ninho</span>
        <span className="user-pill">
          {personNameFor(user.email)}
          <LogoutButton />
        </span>
      </header>
      <main className="app-main">{children}</main>
      <NavLinks />
    </div>
  );
}
