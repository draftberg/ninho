# Ninho — Organizador Financeiro do Casal

Web app (PWA) para o casal registrar entradas, saídas e investimentos, com
visão consolidada e uma reserva dedicada ao bebê. Next.js + Supabase (banco
Postgres + Auth com Google), hospedado na Vercel.

## Stack

- **Next.js** (App Router, Server Actions) — frontend + backend.
- **Supabase** — banco Postgres e autenticação (Google OAuth).
- **Vercel** — hospedagem e deploy automático a partir do GitHub.
- **Anthropic API** — categorização automática de extratos importados.

## Passos para colocar no ar

Esses passos dependem de contas próprias e precisam ser feitos por vocês
(o Claude Code pode guiar cada um em tempo real, mas não consegue criar
contas/credenciais por vocês).

1. **Criar um projeto no [supabase.com](https://supabase.com)** (plano gratuito).
2. No SQL editor do projeto, rode o conteúdo de [`supabase/schema.sql`](./supabase/schema.sql)
   para criar as tabelas `entries` e `settings` com as políticas de segurança
   (RLS restrita às 2 contas do casal).
3. **Criar um projeto no [Google Cloud Console](https://console.cloud.google.com/)**:
   - Configure a tela de consentimento OAuth.
   - Crie uma credencial "OAuth Client ID" do tipo "Web application".
   - Copie o Client ID e o Client Secret.
4. No Supabase, vá em **Authentication → Providers → Google** e cole essas
   credenciais.
5. Copie `.env.example` para `.env.local` e preencha:
   - `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project
     Settings → API do Supabase).
   - `ANTHROPIC_API_KEY` (necessária só para a tela de importação de
     extrato).
6. Ajuste os e-mails/nomes do casal em `src/lib/allowlist.ts` (e replique os
   mesmos e-mails na função `is_allowed_email()` de `supabase/schema.sql`
   caso mude os e-mails).
7. `npm install && npm run dev` para rodar localmente.
8. **Deploy**: conecte este repositório do GitHub a um projeto na Vercel e
   configure as mesmas variáveis de ambiente do passo 5 lá.

## Estrutura

```
src/app/
  login/               tela de login (Google OAuth)
  auth/callback/        troca do código OAuth por sessão + checagem da allowlist
  (app)/dashboard/       visão geral com gráficos (donut + evolução) e filtro por mês
  (app)/lancar/          formulário de novo lançamento
  (app)/historico/       lista de lançamentos com filtros e exclusão
  (app)/reserva-bebe/    meta, progresso e ilustração do ninho
  (app)/importar-extrato/ upload de extrato + categorização via IA (Anthropic)
src/lib/
  supabase/              clientes Supabase (browser, server, middleware)
  allowlist.ts           e-mails permitidos + nome de exibição de cada pessoa
  actions.ts             server actions (inserir/excluir lançamento, editar meta)
  import-extrato.ts       server action que chama a API da Anthropic
  types.ts, aggregate.ts, data.ts, format.ts
src/middleware.ts        protege as rotas: exige login e checa a allowlist
supabase/schema.sql       tabelas + Row Level Security
public/manifest.json      configuração do PWA
```

## Segurança de acesso

O login é feito via Google, mas só os e-mails listados em
`src/lib/allowlist.ts` conseguem entrar — qualquer outra conta Google válida
é deslogada automaticamente (checagem no middleware e na função OAuth
callback). A mesma restrição é reforçada no banco via Row Level Security em
`supabase/schema.sql`.

## Categorias

- **Entrada** → Salário / Freela / Outros
- **Saída** → Fixo / Variável
- **Investimento** → Nenem / Futuro / Reserva

A "Reserva do bebê" soma automaticamente os lançamentos de
Investimento → Nenem.

## Desenvolvimento

```bash
npm run dev       # servidor de desenvolvimento
npm run lint      # eslint
npx tsc --noEmit  # checagem de tipos
npm run build     # build de produção
```
