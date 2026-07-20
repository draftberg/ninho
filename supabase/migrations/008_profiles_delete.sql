-- Ninho — migração: permite resetar o próprio perfil (botão "Resetar
-- informações" em Perfil). Faltava a policy de delete em profiles.
-- Rode este arquivo no SQL editor do Supabase. É seguro rodar mais de uma vez.

drop policy if exists "cada um apaga o proprio perfil" on profiles;
create policy "cada um apaga o proprio perfil" on profiles
  for delete using (is_allowed_email() and email = auth.email());
