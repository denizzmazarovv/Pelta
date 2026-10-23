-- Pelta Nera: всё для Supabase одним файлом. Скопируйте ВЕСЬ текст (Ctrl+A, Ctrl+C) и вставьте в SQL Editor → Run.

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

-- Если таблица profiles уже была создана раньше с другими колонками — добавляем недостающие
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
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
  begin
    insert into public.profiles (id, email) values (new.id, new.email) on conflict (id) do nothing;
  exception when others then
    null;
  end;
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
do $$
begin
  insert into public.profiles (id, email)
  select u.id, u.email from auth.users u
  where u.email is not null
  on conflict (id) do nothing;
exception when others then
  raise notice 'profiles backfill skipped: %', sqlerrm;
end $$;

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

/*
  Pelta Nera — заказы, сообщения и подписки хранятся в Supabase (вместо Google Таблиц).
  Запустите целиком: SQL Editor → New query → вставить → Run. Можно запускать повторно.

  Таблицы называются pn_orders, pn_contact_messages, pn_newsletter (приставка pn_ —
  чтобы не пересекаться со старыми таблицами orders и т.п. от прошлой версии сайта).

  Защита:
  - Сайт (anon / authenticated) может только ДОБАВЛЯТЬ строки. Читать, менять и удалять
    чужие данные с сайта нельзя. Смотреть всё можно только вам в панели Supabase
    (Table Editor), там права администратора.
  - Клиент, вошедший в аккаунт, видит только свои заказы.
  - Ограничения длины и формата полей проверяются в самой базе.
  - Защита от спама: не больше 5 записей с одного телефона/email за 10 минут.
*/

-- ЗАКАЗЫ ------------------------------------------------------------------
create table if not exists public.pn_orders (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  name text not null check (char_length(name) between 2 and 60),
  phone text not null check (phone ~ '^\+?[0-9]{9,15}$'),
  email text check (email is null or (char_length(email) <= 120 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  address text not null check (char_length(address) between 3 and 200),
  comment text check (comment is null or char_length(comment) <= 500),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  total bigint not null check (total >= 0),
  lang text check (lang in ('en', 'ru', 'uz')),
  status text not null default 'new' check (status in ('new', 'confirmed', 'shipped', 'done', 'cancelled'))
);

-- СООБЩЕНИЯ ---------------------------------------------------------------
create table if not exists public.pn_contact_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  name text not null check (char_length(name) between 2 and 60),
  phone text check (phone is null or phone ~ '^\+?[0-9]{9,15}$'),
  email text check (email is null or (char_length(email) <= 120 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  message text not null check (char_length(message) between 2 and 500),
  lang text check (lang in ('en', 'ru', 'uz')),
  constraint pn_contact_has_channel check (phone is not null or email is not null)
);

-- РАССЫЛКА ----------------------------------------------------------------
create table if not exists public.pn_newsletter (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  email text not null unique check (char_length(email) <= 120 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  prefs text[] not null default '{}' check (prefs <@ array['women', 'men']::text[]),
  lang text check (lang in ('en', 'ru', 'uz'))
);

-- Пользователь не может подставить чужой user_id
create or replace function public.force_own_user_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.user_id := auth.uid();
  return new;
end;
$$;

drop trigger if exists orders_own_user on public.pn_orders;
create trigger orders_own_user before insert on public.pn_orders
  for each row execute function public.force_own_user_id();

drop trigger if exists contact_own_user on public.pn_contact_messages;
create trigger contact_own_user before insert on public.pn_contact_messages
  for each row execute function public.force_own_user_id();

-- Защита от спама: не больше 5 записей с тем же телефоном/email за 10 минут
create or replace function public.limit_spam()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if tg_table_name = 'pn_orders' then
    select count(*) into n from public.pn_orders
     where created_at > now() - interval '10 minutes'
       and (phone = new.phone or (new.email is not null and email = new.email));
  else
    select count(*) into n from public.pn_contact_messages
     where created_at > now() - interval '10 minutes'
       and ((new.phone is not null and phone = new.phone) or (new.email is not null and email = new.email));
  end if;
  if n >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_limit_spam on public.pn_orders;
create trigger orders_limit_spam before insert on public.pn_orders
  for each row execute function public.limit_spam();

drop trigger if exists contact_limit_spam on public.pn_contact_messages;
create trigger contact_limit_spam before insert on public.pn_contact_messages
  for each row execute function public.limit_spam();

revoke execute on function public.limit_spam() from public, anon, authenticated;

create index if not exists pn_orders_created_idx on public.pn_orders (created_at desc);
create index if not exists pn_orders_user_idx on public.pn_orders (user_id);
create index if not exists pn_contact_created_idx on public.pn_contact_messages (created_at desc);

-- RLS и права -------------------------------------------------------------
alter table public.pn_orders enable row level security;
alter table public.pn_contact_messages enable row level security;
alter table public.pn_newsletter enable row level security;

revoke all on public.pn_orders, public.pn_contact_messages, public.pn_newsletter from anon, authenticated;

grant insert (name, phone, email, address, comment, items, total, lang) on public.pn_orders to anon, authenticated;
grant insert (name, phone, email, message, lang) on public.pn_contact_messages to anon, authenticated;
grant insert (email, prefs, lang) on public.pn_newsletter to anon, authenticated;
grant select on public.pn_orders to authenticated;

drop policy if exists "insert_orders" on public.pn_orders;
create policy "insert_orders" on public.pn_orders for insert to anon, authenticated with check (true);

drop policy if exists "select_own_orders" on public.pn_orders;
create policy "select_own_orders" on public.pn_orders for select to authenticated
  using (user_id is not null and user_id = (select auth.uid()));

drop policy if exists "insert_messages" on public.pn_contact_messages;
create policy "insert_messages" on public.pn_contact_messages for insert to anon, authenticated with check (true);

drop policy if exists "insert_newsletter" on public.pn_newsletter;
create policy "insert_newsletter" on public.pn_newsletter for insert to anon, authenticated with check (true);

/*
  Pelta Nera — форма заказа: добавлен ник Telegram, адрес стал необязательным.
  Запустите в SQL Editor → Run. Можно запускать повторно.
*/
alter table public.pn_orders add column if not exists telegram text;
alter table public.pn_orders drop constraint if exists pn_orders_telegram_check;
alter table public.pn_orders add constraint pn_orders_telegram_check
  check (telegram is null or telegram ~ '^@[A-Za-z][A-Za-z0-9_]{3,30}[A-Za-z0-9]$');

alter table public.pn_orders alter column address drop not null;
alter table public.pn_orders drop constraint if exists pn_orders_address_check;
alter table public.pn_orders add constraint pn_orders_address_check
  check (address is null or char_length(address) between 3 and 200);

grant insert (telegram) on public.pn_orders to anon, authenticated;

/*
  Pelta Nera — поле «Telegram / Instagram»: необязательное, ник Telegram или Instagram.
  Запустите в SQL Editor → Run. Можно запускать повторно.
*/
alter table public.pn_orders add column if not exists telegram text;
alter table public.pn_orders drop constraint if exists pn_orders_telegram_check;
alter table public.pn_orders add constraint pn_orders_telegram_check
  check (telegram is null or telegram ~ '^@[A-Za-z0-9_](?:[A-Za-z0-9_]|\.(?!\.))*[A-Za-z0-9_]$' and char_length(telegram) <= 31);

