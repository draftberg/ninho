import { LoginButton } from "./LoginButton";
import { NestIllustration } from "@/components/NestIllustration";

const ERROR_MESSAGES: Record<string, string> = {
  not_allowed: "Essa conta Google não tem acesso ao Ninho.",
  auth_failed: "Não foi possível concluir o login. Tente novamente.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="login-screen">
      <div className="login-card">
        <NestIllustration progress={0.5} size={96} />
        <h1>Ninho</h1>
        <p className="login-subtitle">O organizador financeiro do casal.</p>
        {error && <p className="login-error">{ERROR_MESSAGES[error] ?? "Erro ao entrar."}</p>}
        <LoginButton />
      </div>
    </main>
  );
}
