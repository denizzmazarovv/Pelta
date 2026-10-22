/*
  Pelta Nera — профили клиентов и защита данных.
  Запустите целиком в Supabase: SQL Editor → New query → вставить → Run.
  Скрипт можно запускать повторно — он ничего не сломает.

  Что делает:
  1. Таблица profiles (имя, телефон, интересы, согласие на рассылку).
  2. Профиль создаётся автоматически на сервере при регистрации (триггер),
     клиент сам вставлять строки не может.
  3. RLS: каждый видит и меняет только свой профиль.
  4. Права на уровне колонок: клиент может менять только имя, телефон,
     интересы и согласие. id, email и даты изменить нельзя.
  5. Удаление профилей с сайта запрещено.
*/

-- 1. Таблица ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists prefs text[] not null default '{}';
alter table public.profiles add column if not exists marketing boolean not null default false;
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

-- Ограничения на данные (защита от мусора и огромных строк)
alter table public.profiles drop constraint if exists profiles_full_name_len;
alter table public.profiles add constraint profiles_full_name_len
  check (full_name is null or char_length(full_name) between 1 and 60) not valid;

alter table public.profiles drop constraint if exists profiles_phone_format;
alter table public.profiles add constraint profiles_phone_format
  check (phone is null or phone ~ '^\+?[0-9]{9,15}$');

alter table public.profiles drop constraint if exists profiles_prefs_valid;
alter table public.profiles add constraint profiles_prefs_valid
  check (prefs <@ array['women', 'men']::text[]);

-- 2. Автоматическое создание профиля при регистрации -----------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := nullif(left(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), 60), '');
  v_phone text := nullif(regexp_replace(coalesce(new.raw_user_meta_data->>'phone', ''), '[^0-9+]', '', 'g'), '');
  v_prefs text[] := '{}';
begin
  if v_phone is not null and v_phone !~ '^\+?[0-9]{9,15}$' then
    v_phone := null;
  end if;

  if jsonb_typeof(new.raw_user_meta_data->'prefs') = 'array' then
    select coalesce(array_agg(distinct p), '{}')
      into v_prefs
      from jsonb_array_elements_text(new.raw_user_meta_data->'prefs') as p
     where p in ('women', 'men');
  end if;

  insert into public.profiles (id, email, full_name, phone, prefs, marketing)
  values (
    new.id,
    new.email,
    v_name,
    v_phone,
    v_prefs,
    coalesce((new.raw_user_meta_data->>'marketing')::boolean, false)
  )
  on conflict (id) do nothing;

  return new;
exception when others then
  -- Регистрация не должна падать из-за профиля
  insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Email в профиле всегда совпадает с подтверждённым email аккаунта
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email, updated_at = now() where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row execute function public.sync_profile_email();

-- updated_at
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- Профили для уже существующих пользователей
insert into public.profiles (id, email)
select u.id, u.email from auth.users u
where u.email is not null
on conflict (id) do nothing;

-- 3. RLS ------------------------------------------------------------------
alter table public.profiles enable row level security;
-- Без FORCE: серверные триггеры (владелец таблицы) должны иметь возможность создать профиль
alter table public.profiles no force row level security;

drop policy if exists "select_own_profile" on public.profiles;
drop policy if exists "insert_own_profile" on public.profiles;
drop policy if exists "update_own_profile" on public.profiles;
drop policy if exists "delete_own_profile" on public.profiles;

create policy "select_own_profile" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

create policy "update_own_profile" on public.profiles
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- 4. Права на колонки -----------------------------------------------------
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (full_name, phone, prefs, marketing) on public.profiles to authenticated;

-- Функции-триггеры нельзя вызывать через API
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.sync_profile_email() from public, anon, authenticated;
