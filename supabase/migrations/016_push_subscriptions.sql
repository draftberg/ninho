create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  autor text not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

drop policy if exists "casal pode ver push subscriptions" on push_subscriptions;
create policy "casal pode ver push subscriptions" on push_subscriptions
  for select using (is_allowed_email());

drop policy if exists "casal pode criar push subscriptions" on push_subscriptions;
create policy "casal pode criar push subscriptions" on push_subscriptions
  for insert with check (is_allowed_email());

drop policy if exists "casal pode atualizar push subscriptions" on push_subscriptions;
create policy "casal pode atualizar push subscriptions" on push_subscriptions
  for update using (is_allowed_email()) with check (is_allowed_email());

drop policy if exists "casal pode apagar push subscriptions" on push_subscriptions;
create policy "casal pode apagar push subscriptions" on push_subscriptions
  for delete using (is_allowed_email());
