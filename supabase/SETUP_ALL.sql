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
  check (telegram is null or telegram ~ '^@[A-Za-z][A-Za-z0-9_]{3,30}[A-Za-z0-9]$') not valid;

alter table public.pn_orders alter column address drop not null;
alter table public.pn_orders drop constraint if exists pn_orders_address_check;
alter table public.pn_orders add constraint pn_orders_address_check
  check (address is null or char_length(address) between 3 and 200) not valid;

grant insert (telegram) on public.pn_orders to anon, authenticated;

/*
  Pelta Nera — поле «Telegram / Instagram»: необязательное, ник Telegram или Instagram.
  Запустите в SQL Editor → Run. Можно запускать повторно.
*/
alter table public.pn_orders add column if not exists telegram text;
alter table public.pn_orders drop constraint if exists pn_orders_telegram_check;
alter table public.pn_orders add constraint pn_orders_telegram_check
  check (telegram is null or telegram ~ '^@[A-Za-z0-9_](?:[A-Za-z0-9_]|\.(?!\.))*[A-Za-z0-9_]$' and char_length(telegram) <= 31) not valid;

/*
  Pelta Nera — вход и регистрация только по номеру телефона (код в Telegram).
  Запустите в SQL Editor → Run. Можно запускать повторно.

  1. profiles: email больше не обязателен, номер телефона берётся из подтверждённого
     номера аккаунта (auth.users.phone) и не может быть изменён с сайта.
  2. pn_otp_requests: журнал отправок кодов для лимитов. Хранит только хеш номера,
     доступ — только у серверной функции (service_role). Записи старше 7 дней удаляются.
  3. pn_otp_allow(): атомарная проверка лимитов перед отправкой кода.
*/

-- 1. Профили ----------------------------------------------------------------
alter table public.profiles alter column email drop not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := nullif(left(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), 60), '');
  v_phone text := nullif(regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g'), '');
begin
  if v_phone is not null then
    v_phone := '+' || v_phone;
    if v_phone !~ '^\+[0-9]{9,15}$' then v_phone := null; end if;
  end if;

  insert into public.profiles (id, email, full_name, phone, prefs, marketing)
  values (new.id, new.email, v_name, v_phone, '{}', false)
  on conflict (id) do nothing;
  return new;
exception when others then
  begin
    insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  exception when others then null;
  end;
  return new;
end;
$$;

-- Подтверждённый номер (или email) аккаунта всегда копируется в профиль
create or replace function public.sync_profile_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.phone is distinct from old.phone or new.email is distinct from old.email then
    update public.profiles
       set phone = case when coalesce(new.phone, '') = '' then null else '+' || regexp_replace(new.phone, '[^0-9]', '', 'g') end,
           email = new.email,
           updated_at = now()
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
drop trigger if exists on_auth_user_contact_changed on auth.users;
create trigger on_auth_user_contact_changed
  after update of phone, email on auth.users
  for each row execute function public.sync_profile_contact();

revoke execute on function public.sync_profile_contact() from public, anon, authenticated;

-- С сайта можно менять только имя, интересы и согласие на рассылку. Телефон — нет.
revoke update on public.profiles from authenticated;
revoke update (phone, email, full_name, prefs, marketing) on public.profiles from authenticated;
grant update (full_name, prefs, marketing) on public.profiles to authenticated;

-- 2. Журнал отправок кодов ----------------------------------------------------
create table if not exists public.pn_otp_requests (
  id bigint generated always as identity primary key,
  phone_hash text not null check (char_length(phone_hash) = 64),
  created_at timestamptz not null default now()
);
create index if not exists pn_otp_requests_hash_idx on public.pn_otp_requests (phone_hash, created_at desc);
create index if not exists pn_otp_requests_created_idx on public.pn_otp_requests (created_at desc);

alter table public.pn_otp_requests enable row level security;
revoke all on public.pn_otp_requests from anon, authenticated;
-- политик нет: читать и писать может только service_role (серверная функция)

-- 3. Проверка лимитов ----------------------------------------------------------
create or replace function public.pn_otp_allow(
  p_hash text,
  p_per_hour int default 5,
  p_per_day int default 10,
  p_global_day int default 300
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  n_hour int;
  n_day int;
  n_global int;
begin
  -- один номер обрабатываем строго по очереди
  perform pg_advisory_xact_lock(hashtext(p_hash));

  select count(*) filter (where created_at > now() - interval '1 hour'),
         count(*)
    into n_hour, n_day
    from public.pn_otp_requests
   where phone_hash = p_hash and created_at > now() - interval '1 day';

  if n_hour >= p_per_hour then return 'phone_hour'; end if;
  if n_day >= p_per_day then return 'phone_day'; end if;

  select count(*) into n_global from public.pn_otp_requests where created_at > now() - interval '1 day';
  if n_global >= p_global_day then return 'global_day'; end if;

  insert into public.pn_otp_requests (phone_hash) values (p_hash);
  delete from public.pn_otp_requests where created_at < now() - interval '7 days';
  return 'ok';
end;
$$;

revoke execute on function public.pn_otp_allow(text, int, int, int) from public, anon, authenticated;
grant execute on function public.pn_otp_allow(text, int, int, int) to service_role;

-- ===== 20261026090000_telegram_bot_links.sql =====
/*
  Pelta Nera — связка «номер телефона → чат с ботом» для кодов входа в Telegram.
  Запустите в SQL Editor → Run. Можно запускать повторно.

  Номер хранится только как HMAC-хеш (64 символа), сами цифры не видны.
  Доступ к таблице — только у серверной функции (service_role); с сайта её не видно.
*/
create table if not exists public.pn_telegram_links (
  phone_hash text primary key check (char_length(phone_hash) = 64),
  chat_id bigint not null,
  linked_at timestamptz not null default now()
);

alter table public.pn_telegram_links enable row level security;
revoke all on public.pn_telegram_links from anon, authenticated;
grant select, insert, update, delete on public.pn_telegram_links to service_role;
-- политик нет: читать и писать может только service_role

-- ===== 20261027090000_orders_verified_only.sql =====
/*
  Pelta Nera — заказы только от клиентов, подтвердивших номер через Telegram-бота.
  Запустите в SQL Editor → Run. Можно запускать повторно.

  - Анонимно добавить заказ больше нельзя.
  - Вошедший клиент может добавить заказ только со своим подтверждённым номером
    (номер берётся из профиля, а туда — из подтверждённого аккаунта).
*/
revoke insert on public.pn_orders from anon;
grant insert (name, phone, email, address, comment, items, total, lang, telegram) on public.pn_orders to authenticated;

drop policy if exists "insert_orders" on public.pn_orders;
create policy "insert_orders" on public.pn_orders for insert to authenticated
  with check (
    phone = (select p.phone from public.profiles p where p.id = (select auth.uid()))
  );

-- ===== 20261028090000_telegram_one_tap_login.sql =====
/*
  Pelta Nera — вход на сайт через Telegram-бота в одно касание.
  Запустите в SQL Editor → Run. Можно запускать повторно.

  pn_telegram_links.phone_enc — номер в зашифрованном виде (AES-GCM, ключ знает только
  серверная функция). Нужен, чтобы знакомому клиенту не делиться номером повторно.

  pn_login_requests — короткоживущие запросы входа (10 минут, затем удаляются).
  Ключ входа хранится только как хеш; номер и код — только в зашифрованном виде.
  Доступ к обеим таблицам — только у серверной функции (service_role).
*/
alter table public.pn_telegram_links add column if not exists phone_enc text;
create index if not exists pn_telegram_links_chat_idx on public.pn_telegram_links (chat_id, linked_at desc);

create table if not exists public.pn_login_requests (
  nonce_hash text primary key check (char_length(nonce_hash) = 64),
  nonce_enc text not null,
  chat_id bigint not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'claiming', 'done')),
  phone_enc text,
  phone_hash text check (phone_hash is null or char_length(phone_hash) = 64),
  otp_enc text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index if not exists pn_login_requests_chat_idx on public.pn_login_requests (chat_id, created_at desc);
create index if not exists pn_login_requests_claim_idx on public.pn_login_requests (phone_hash) where status = 'claiming';

alter table public.pn_login_requests enable row level security;
revoke all on public.pn_login_requests from anon, authenticated;
grant select, insert, update, delete on public.pn_login_requests to service_role;
-- политик нет: читать и писать может только service_role

-- ===== 20261029090000_users_to_google_sheet.sql =====
/*
  Pelta Nera — список клиентов в Google-таблице и уведомление о новом клиенте в канал.
  Запустите в SQL Editor → Run. Можно запускать повторно.

  Как работает:
  1. При событии (запрошен код, номер подтверждён, клиент сохранил имя) база создаёт
     одноразовое событие со случайным ID и отправляет этот ID скрипту Google (pg_net).
  2. Скрипт Google забирает данные по ID через pn_take_sheet_event() и обновляет строку
     клиента в листе «Users PeltaNera». Для нового подтверждённого клиента бот пишет в канал.
  3. Событие срабатывает один раз и живёт не дольше часа — подделать запись в таблице,
     зная только адрес скрипта, нельзя.
*/
create extension if not exists pg_net;

create table if not exists public.pn_sheet_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('code', 'confirmed', 'name')),
  created_at timestamptz not null default now()
);
alter table public.pn_sheet_events enable row level security;
revoke all on public.pn_sheet_events from anon, authenticated;

-- Адрес скрипта Google (тот же, что принимает заказы)
create or replace function public.pn_sheet_url()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'https://script.google.com/macros/s/AKfycbwcTc8QsfEVx3440DozhVa7sbB5ZZRbgRN2iI2BMxCRuihZS72EZQCXfd1C_eZd7Nm7Jw/exec'::text
$$;

create or replace function public.pn_sheet_notify(p_user uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  delete from public.pn_sheet_events where created_at < now() - interval '1 day';
  insert into public.pn_sheet_events (user_id, kind) values (p_user, p_kind) returning id into v_id;
  perform net.http_post(
    url := public.pn_sheet_url(),
    body := jsonb_build_object('event_id', v_id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
exception when others then
  -- Таблица — дополнительный учёт: её сбой не должен мешать входу на сайт
  null;
end;
$$;
revoke execute on function public.pn_sheet_notify(uuid, text) from public, anon, authenticated;

-- Скрипт Google забирает данные события (один раз, не позже чем через час)
create or replace function public.pn_take_sheet_event(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev record;
  out jsonb;
begin
  delete from public.pn_sheet_events
   where id = p_id and created_at > now() - interval '1 hour'
  returning user_id, kind into ev;
  if ev.user_id is null then
    return null;
  end if;

  select jsonb_build_object(
           'kind', ev.kind,
           'id', u.id,
           'created_at', u.created_at,
           'phone', case when coalesce(u.phone, '') = '' then null else '+' || regexp_replace(u.phone, '[^0-9]', '', 'g') end,
           'confirmed', u.phone_confirmed_at is not null,
           'confirmed_at', u.phone_confirmed_at,
           'last_code_at', u.confirmation_sent_at,
           'name', p.full_name
         )
    into out
    from auth.users u
    left join public.profiles p on p.id = u.id
   where u.id = ev.user_id;
  return out;
end;
$$;
revoke execute on function public.pn_take_sheet_event(uuid) from public;
grant execute on function public.pn_take_sheet_event(uuid) to anon, authenticated;

-- События аккаунта
create or replace function public.pn_sheet_on_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.phone, '') = '' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    perform public.pn_sheet_notify(new.id, case when new.phone_confirmed_at is not null then 'confirmed' else 'code' end);
  else
    if old.phone_confirmed_at is null and new.phone_confirmed_at is not null then
      perform public.pn_sheet_notify(new.id, 'confirmed');
    elsif new.confirmation_sent_at is distinct from old.confirmation_sent_at and new.confirmation_sent_at is not null then
      perform public.pn_sheet_notify(new.id, 'code');
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.pn_sheet_on_user() from public, anon, authenticated;

drop trigger if exists pn_sheet_user_insert on auth.users;
create trigger pn_sheet_user_insert
  after insert on auth.users
  for each row execute function public.pn_sheet_on_user();

drop trigger if exists pn_sheet_user_update on auth.users;
create trigger pn_sheet_user_update
  after update of phone_confirmed_at, confirmation_sent_at on auth.users
  for each row execute function public.pn_sheet_on_user();

-- Клиент сохранил или поменял имя
create or replace function public.pn_sheet_on_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.full_name is distinct from old.full_name then
    perform public.pn_sheet_notify(new.id, 'name');
  end if;
  return new;
end;
$$;
revoke execute on function public.pn_sheet_on_profile() from public, anon, authenticated;

drop trigger if exists pn_sheet_profile_update on public.profiles;
create trigger pn_sheet_profile_update
  after update of full_name on public.profiles
  for each row execute function public.pn_sheet_on_profile();

-- Уже существующие клиенты попадут в таблицу при следующем входе. Чтобы добавить их сразу:
-- select public.pn_sheet_notify(id, 'code')
--   from auth.users where coalesce(phone, '') <> '';

-- ===== 20261030090000_newsletter_to_google_sheet.sql =====
/*
  Pelta Nera — подписчики рассылки в Google-таблице (лист «Newsletter PeltaNera»)
  и колонки «Интересы» / «Рассылка» в листе клиентов.
  Запустите в SQL Editor → Run. Можно запускать повторно.
*/
alter table public.pn_sheet_events alter column user_id drop not null;
alter table public.pn_sheet_events add column if not exists newsletter_id bigint;
alter table public.pn_sheet_events drop constraint if exists pn_sheet_events_kind_check;
alter table public.pn_sheet_events add constraint pn_sheet_events_kind_check
  check (kind in ('code', 'confirmed', 'name', 'profile', 'newsletter'));

-- Отправка одноразового ID события скрипту Google
create or replace function public.pn_sheet_post(p_event uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform net.http_post(
    url := public.pn_sheet_url(),
    body := jsonb_build_object('event_id', p_event),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
exception when others then
  null;
end;
$$;
revoke execute on function public.pn_sheet_post(uuid) from public, anon, authenticated;

create or replace function public.pn_sheet_notify(p_user uuid, p_kind text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  delete from public.pn_sheet_events where created_at < now() - interval '1 day';
  insert into public.pn_sheet_events (user_id, kind) values (p_user, p_kind) returning id into v_id;
  perform public.pn_sheet_post(v_id);
exception when others then
  null;
end;
$$;

create or replace function public.pn_sheet_on_newsletter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.pn_sheet_events (newsletter_id, kind) values (new.id, 'newsletter') returning id into v_id;
  perform public.pn_sheet_post(v_id);
  return new;
exception when others then
  return new;
end;
$$;
revoke execute on function public.pn_sheet_on_newsletter() from public, anon, authenticated;

drop trigger if exists pn_sheet_newsletter_insert on public.pn_newsletter;
create trigger pn_sheet_newsletter_insert
  after insert on public.pn_newsletter
  for each row execute function public.pn_sheet_on_newsletter();

-- Клиент поменял имя, интересы или согласие на рассылку
create or replace function public.pn_sheet_on_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.full_name is distinct from old.full_name
     or new.prefs is distinct from old.prefs
     or new.marketing is distinct from old.marketing then
    perform public.pn_sheet_notify(new.id, 'profile');
  end if;
  return new;
end;
$$;

drop trigger if exists pn_sheet_profile_update on public.profiles;
create trigger pn_sheet_profile_update
  after update of full_name, prefs, marketing on public.profiles
  for each row execute function public.pn_sheet_on_profile();

-- Данные события для скрипта Google (один раз, не позже чем через час)
create or replace function public.pn_take_sheet_event(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev record;
  out jsonb;
begin
  delete from public.pn_sheet_events
   where id = p_id and created_at > now() - interval '1 hour'
  returning user_id, newsletter_id, kind into ev;
  if ev.kind is null then
    return null;
  end if;

  if ev.kind = 'newsletter' then
    select jsonb_build_object(
             'kind', 'newsletter',
             'id', n.id,
             'created_at', n.created_at,
             'email', n.email,
             'prefs', n.prefs,
             'lang', n.lang
           )
      into out
      from public.pn_newsletter n
     where n.id = ev.newsletter_id;
    return out;
  end if;

  select jsonb_build_object(
           'kind', ev.kind,
           'id', u.id,
           'created_at', u.created_at,
           'phone', case when coalesce(u.phone, '') = '' then null else '+' || regexp_replace(u.phone, '[^0-9]', '', 'g') end,
           'confirmed', u.phone_confirmed_at is not null,
           'confirmed_at', u.phone_confirmed_at,
           'last_code_at', u.confirmation_sent_at,
           'name', p.full_name,
           'prefs', coalesce(p.prefs, '{}'),
           'marketing', coalesce(p.marketing, false)
         )
    into out
    from auth.users u
    left join public.profiles p on p.id = u.id
   where u.id = ev.user_id;
  return out;
end;
$$;
revoke execute on function public.pn_take_sheet_event(uuid) from public;
grant execute on function public.pn_take_sheet_event(uuid) to anon, authenticated;

-- ===== 20261031090000_tiers_roles_exclusive.sql =====
/*
  Pelta Nera — уровни, роли (VIP / CEO), скидки, закрытые товары и ссылки.
  Запустите в SQL Editor → Run. Можно запускать повторно.

  Как устроено:
  - pn_tiers — список уровней и ролей. Ранг выше = больше возможностей
    (всё, что есть у ранга ниже, есть и у ранга выше).
    Уровни с min_orders выдаются сами — по числу ВЫПОЛНЕННЫХ заказов.
    Роли без min_orders (VIP, CEO) назначаются только вручную — в Google-таблице.
  - Ранг клиента = наибольший из: уровня по покупкам и назначенной роли.
  - Роль и статус заказа меняет только скрипт Google-таблицы, у которого есть
    секретный ключ (в базе хранится только его хеш). С сайта это сделать нельзя.
  - Цены и скидки считаются в базе (pn_create_order), подделать их с сайта нельзя.
  - Закрытые товары и ссылки видят только клиенты с нужным рангом (RLS).
*/
create extension if not exists pgcrypto with schema extensions;

-- 1. Уровни и роли ------------------------------------------------------------
create table if not exists public.pn_tiers (
  code text primary key check (code ~ '^[a-z0-9_]{2,20}$'),
  rank int not null unique check (rank >= 0),
  title_en text not null,
  title_ru text not null,
  title_uz text not null,
  min_orders int check (min_orders is null or min_orders >= 0),
  discount_pct numeric(5, 2) not null default 0 check (discount_pct between 0 and 90),
  badge boolean not null default false
);
alter table public.pn_tiers enable row level security;
revoke all on public.pn_tiers from anon, authenticated;
grant select on public.pn_tiers to anon, authenticated;
drop policy if exists "read_tiers" on public.pn_tiers;
create policy "read_tiers" on public.pn_tiers for select to anon, authenticated using (true);

insert into public.pn_tiers (code, rank, title_en, title_ru, title_uz, min_orders, discount_pct, badge) values
  ('member', 0, 'Member', 'Клиент', 'Mijoz', 0, 0, false),
  ('level1', 1, 'Level 1', 'Уровень 1', '1-daraja', 1, 3, false),
  ('level2', 2, 'Level 2', 'Уровень 2', '2-daraja', 3, 5, false),
  ('level3', 3, 'Level 3', 'Уровень 3', '3-daraja', 6, 7, false),
  ('vip', 10, 'VIP', 'VIP', 'VIP', null, 10, true),
  ('ceo', 20, 'CEO', 'CEO', 'CEO', null, 0, true)
on conflict (code) do nothing;

-- Роли, назначенные вручную
create table if not exists public.pn_user_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role_code text not null references public.pn_tiers (code),
  updated_at timestamptz not null default now()
);
alter table public.pn_user_roles enable row level security;
revoke all on public.pn_user_roles from anon, authenticated;

-- Ранг клиента
create or replace function public.pn_rank_of(p_user uuid)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select case when p_user is null then 0 else greatest(
    coalesce((select t.rank from public.pn_user_roles r join public.pn_tiers t on t.code = r.role_code
               where r.user_id = p_user), 0),
    coalesce((select max(t.rank) from public.pn_tiers t
               where t.min_orders is not null
                 and t.min_orders <= (select count(*) from public.pn_orders o
                                       where o.user_id = p_user and o.status = 'done')), 0)
  ) end
$$;
revoke execute on function public.pn_rank_of(uuid) from public, anon, authenticated;

create or replace function public.pn_my_rank()
returns int
language sql
stable
security definer
set search_path = ''
as $$ select public.pn_rank_of(auth.uid()) $$;
revoke execute on function public.pn_my_rank() from public;
grant execute on function public.pn_my_rank() to anon, authenticated;

-- Закрытые ссылки (например, приватный Telegram-канал)
create table if not exists public.pn_tier_links (
  id bigint generated always as identity primary key,
  min_rank int not null default 10,
  title text not null default 'Telegram',
  url text not null check (url ~ '^https://[^\s]+$')
);
alter table public.pn_tier_links enable row level security;
revoke all on public.pn_tier_links from anon, authenticated;
grant select on public.pn_tier_links to authenticated;
drop policy if exists "links_by_rank" on public.pn_tier_links;
create policy "links_by_rank" on public.pn_tier_links for select to authenticated
  using (public.pn_my_rank() >= min_rank);

-- Статус клиента (для профиля и для Google-таблицы)
create or replace function public.pn_status_of(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rank int := public.pn_rank_of(p_user);
  v_done int := (select count(*) from public.pn_orders o where o.user_id = p_user and o.status = 'done');
  v_role text := (select r.role_code from public.pn_user_roles r where r.user_id = p_user);
  v_tier jsonb;
  v_next jsonb;
begin
  select to_jsonb(t) into v_tier from public.pn_tiers t where t.rank <= v_rank order by t.rank desc limit 1;
  select to_jsonb(t) into v_next from public.pn_tiers t
   where t.min_orders is not null and t.min_orders > v_done and t.rank > v_rank
   order by t.min_orders limit 1;
  return jsonb_build_object('rank', v_rank, 'tier', v_tier, 'role', v_role, 'done_orders', v_done, 'next', v_next);
end;
$$;
revoke execute on function public.pn_status_of(uuid) from public, anon, authenticated;

create or replace function public.pn_my_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return null;
  end if;
  return public.pn_status_of(auth.uid())
    || jsonb_build_object('links', coalesce((
         select jsonb_agg(jsonb_build_object('title', l.title, 'url', l.url) order by l.min_rank desc)
           from public.pn_tier_links l
          where public.pn_rank_of(auth.uid()) >= l.min_rank), '[]'::jsonb));
end;
$$;
revoke execute on function public.pn_my_status() from public, anon;
grant execute on function public.pn_my_status() to authenticated;

-- 2. Цены и закрытые товары -----------------------------------------------------
create table if not exists public.pn_products (
  id text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  price numeric(10, 2) not null check (price >= 0),
  min_rank int not null default 0 check (min_rank >= 0),
  active boolean not null default true,
  -- для закрытых товаров (у открытых описание хранится в коде сайта):
  category text check (category is null or category ~ '^[a-z0-9_]{2,20}$'),
  name_en text, name_ru text, name_uz text,
  desc_en text, desc_ru text, desc_uz text,
  images text[] not null default '{}',
  dimensions text, weight text,
  created_at timestamptz not null default now()
);
alter table public.pn_products enable row level security;
revoke all on public.pn_products from anon, authenticated;
grant select on public.pn_products to anon, authenticated;
drop policy if exists "products_by_rank" on public.pn_products;
create policy "products_by_rank" on public.pn_products for select to anon, authenticated
  using (active and (min_rank = 0 or public.pn_my_rank() >= min_rank));

insert into public.pn_products (id, price) values
  ('ch-01', 60), ('ch-02', 56), ('kc-01', 30), ('bag-01', 184), ('bag-02', 227), ('belt-01', 73), ('belt-02', 86)
on conflict (id) do nothing;

-- Фото закрытых товаров — в приватном хранилище «exclusive»
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values ('exclusive', 'exclusive', false)
    on conflict (id) do nothing;
    execute 'drop policy if exists "exclusive_by_rank" on storage.objects';
    execute $p$create policy "exclusive_by_rank" on storage.objects for select to authenticated
      using (bucket_id = 'exclusive' and exists (
        select 1 from public.pn_products p
         where name = any (p.images) and p.active and public.pn_my_rank() >= p.min_rank))$p$;
  end if;
end $$;

-- 3. Заказ: цены и скидка считаются здесь ---------------------------------------
create or replace function public.pn_create_order(p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_phone text;
  v_name text;
  v_rank int;
  v_disc numeric;
  v_tier text;
  v_item jsonb;
  v_prod record;
  v_qty int;
  v_unit numeric;
  v_lines jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_id bigint;
  v_tg text := nullif(btrim(coalesce(p->>'telegram', '')), '');
  v_addr text := nullif(btrim(coalesce(p->>'address', '')), '');
  v_comment text := nullif(btrim(coalesce(p->>'comment', '')), '');
  v_lang text := coalesce(nullif(p->>'lang', ''), 'en');
begin
  if v_uid is null then raise exception 'auth_required' using errcode = 'P0001'; end if;

  select '+' || regexp_replace(u.phone, '[^0-9]', '', 'g') into v_phone
    from auth.users u where u.id = v_uid and u.phone_confirmed_at is not null and coalesce(u.phone, '') <> '';
  if v_phone is null then raise exception 'phone_not_confirmed' using errcode = 'P0001'; end if;

  select nullif(btrim(coalesce(pr.full_name, '')), '') into v_name from public.profiles pr where pr.id = v_uid;
  if v_name is null or char_length(v_name) < 2 then raise exception 'name_required' using errcode = 'P0001'; end if;

  if (select count(*) from public.pn_orders o where o.user_id = v_uid and o.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') not between 1 and 50 then
    raise exception 'items_invalid' using errcode = 'P0001';
  end if;

  v_rank := public.pn_rank_of(v_uid);
  select t.discount_pct, t.code into v_disc, v_tier from public.pn_tiers t where t.rank <= v_rank order by t.rank desc limit 1;
  v_disc := coalesce(v_disc, 0);

  for v_item in select * from jsonb_array_elements(p->'items') loop
    select * into v_prod from public.pn_products pp where pp.id = v_item->>'id' and pp.active;
    if v_prod.id is null or v_rank < v_prod.min_rank then
      raise exception 'item_unavailable' using errcode = 'P0001';
    end if;
    v_qty := least(greatest(coalesce((v_item->>'quantity')::int, 1), 1), 99);
    v_unit := round(v_prod.price * (100 - v_disc) / 100);
    v_total := v_total + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'id', v_prod.id, 'quantity', v_qty, 'price', v_prod.price, 'unit', v_unit, 'line_total', v_unit * v_qty,
      'color', left(coalesce(v_item->>'color', ''), 40), 'name', left(coalesce(v_item->>'name', v_prod.name_en, v_prod.id), 80));
  end loop;

  if v_tg is not null and v_tg !~ '^@[A-Za-z0-9_](?:[A-Za-z0-9_]|\.(?!\.))*[A-Za-z0-9_]$' then v_tg := null; end if;
  if v_addr is not null and char_length(v_addr) < 3 then v_addr := null; end if;

  insert into public.pn_orders (name, phone, address, comment, items, total, lang, telegram, status)
  values (left(v_name, 60), v_phone, left(v_addr, 200), left(v_comment, 500), v_lines, v_total,
          case when v_lang in ('en', 'ru', 'uz') then v_lang else 'en' end, left(v_tg, 31), 'new')
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'total', v_total, 'discount_pct', v_disc, 'tier', v_tier,
                            'name', v_name, 'phone', v_phone, 'lines', v_lines);
end;
$$;
revoke execute on function public.pn_create_order(jsonb) from public, anon;
grant execute on function public.pn_create_order(jsonb) to authenticated;

-- 4. Управление из Google-таблицы (только с секретным ключом скрипта) ----------
create table if not exists public.pn_admin_keys (
  id int primary key default 1 check (id = 1),
  key_hash text not null check (char_length(key_hash) = 64),
  created_at timestamptz not null default now()
);
alter table public.pn_admin_keys enable row level security;
revoke all on public.pn_admin_keys from anon, authenticated;

-- Скрипт таблицы регистрирует хеш своего ключа ОДИН раз. Сменить ключ можно только
-- здесь, в SQL Editor: delete from public.pn_admin_keys; и снова запустить настройку скрипта.
create or replace function public.pn_sheet_register_key(p_hash text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_hash !~ '^[0-9a-f]{64}$' then return false; end if;
  insert into public.pn_admin_keys (id, key_hash) values (1, p_hash) on conflict (id) do nothing;
  return found;
end;
$$;
revoke execute on function public.pn_sheet_register_key(text) from public;
grant execute on function public.pn_sheet_register_key(text) to anon;

create or replace function public.pn_sheet_key_ok(p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(char_length(p_key) between 40 and 200
    and exists (select 1 from public.pn_admin_keys k
                 where k.key_hash = encode(extensions.digest(p_key, 'sha256'), 'hex')), false)
$$;
revoke execute on function public.pn_sheet_key_ok(text) from public, anon, authenticated;

create or replace function public.pn_sheet_set_role(p_key text, p_user uuid, p_role text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := lower(btrim(coalesce(p_role, '')));
begin
  if not public.pn_sheet_key_ok(p_key) then return 'bad_key'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then return 'no_user'; end if;
  if v_role in ('', '-', 'нет', 'none') then
    delete from public.pn_user_roles where user_id = p_user;
    return 'ok';
  end if;
  if not exists (select 1 from public.pn_tiers t where t.code = v_role and t.min_orders is null) then
    return 'bad_role';
  end if;
  insert into public.pn_user_roles (user_id, role_code, updated_at) values (p_user, v_role, now())
  on conflict (user_id) do update set role_code = excluded.role_code, updated_at = now();
  return 'ok';
end;
$$;
revoke execute on function public.pn_sheet_set_role(text, uuid, text) from public;
grant execute on function public.pn_sheet_set_role(text, uuid, text) to anon;

create or replace function public.pn_sheet_set_order_status(p_key text, p_order bigint, p_status text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text := case lower(btrim(coalesce(p_status, '')))
    when 'новый' then 'new' when 'new' then 'new'
    when 'подтверждён' then 'confirmed' when 'подтвержден' then 'confirmed' when 'confirmed' then 'confirmed'
    when 'отправлен' then 'shipped' when 'shipped' then 'shipped'
    when 'выполнен' then 'done' when 'done' then 'done'
    when 'отменён' then 'cancelled' when 'отменен' then 'cancelled' when 'cancelled' then 'cancelled'
    else null end;
begin
  if not public.pn_sheet_key_ok(p_key) then return 'bad_key'; end if;
  if v_status is null then return 'bad_status'; end if;
  update public.pn_orders set status = v_status where id = p_order;
  return case when found then 'ok' else 'no_order' end;
end;
$$;
revoke execute on function public.pn_sheet_set_order_status(text, bigint, text) from public;
grant execute on function public.pn_sheet_set_order_status(text, bigint, text) to anon;

-- 5. Обновление строки клиента в Google-таблице при смене роли или статуса заказа
create or replace function public.pn_sheet_on_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.pn_sheet_notify(coalesce(new.user_id, old.user_id), 'profile');
  return null;
end;
$$;
revoke execute on function public.pn_sheet_on_role() from public, anon, authenticated;
drop trigger if exists pn_sheet_role_change on public.pn_user_roles;
create trigger pn_sheet_role_change after insert or update or delete on public.pn_user_roles
  for each row execute function public.pn_sheet_on_role();

create or replace function public.pn_sheet_on_order_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null and new.status is distinct from old.status then
    perform public.pn_sheet_notify(new.user_id, 'profile');
  end if;
  return new;
end;
$$;
revoke execute on function public.pn_sheet_on_order_status() from public, anon, authenticated;
drop trigger if exists pn_sheet_order_status on public.pn_orders;
create trigger pn_sheet_order_status after update of status on public.pn_orders
  for each row execute function public.pn_sheet_on_order_status();

-- Данные для строки клиента: добавлены роль, уровень и число покупок
create or replace function public.pn_take_sheet_event(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev record;
  out jsonb;
  st jsonb;
begin
  delete from public.pn_sheet_events
   where id = p_id and created_at > now() - interval '1 hour'
  returning user_id, newsletter_id, kind into ev;
  if ev.kind is null then
    return null;
  end if;

  if ev.kind = 'newsletter' then
    select jsonb_build_object('kind', 'newsletter', 'id', n.id, 'created_at', n.created_at,
                              'email', n.email, 'prefs', n.prefs, 'lang', n.lang)
      into out from public.pn_newsletter n where n.id = ev.newsletter_id;
    return out;
  end if;

  st := public.pn_status_of(ev.user_id);
  select jsonb_build_object(
           'kind', ev.kind,
           'id', u.id,
           'created_at', u.created_at,
           'phone', case when coalesce(u.phone, '') = '' then null else '+' || regexp_replace(u.phone, '[^0-9]', '', 'g') end,
           'confirmed', u.phone_confirmed_at is not null,
           'confirmed_at', u.phone_confirmed_at,
           'last_code_at', u.confirmation_sent_at,
           'name', p.full_name,
           'prefs', coalesce(p.prefs, '{}'),
           'marketing', coalesce(p.marketing, false),
           'role', coalesce(st->>'role', ''),
           'level', st->'tier'->>'title_ru',
           'done_orders', (st->>'done_orders')::int
         )
    into out
    from auth.users u
    left join public.profiles p on p.id = u.id
   where u.id = ev.user_id;
  return out;
end;
$$;
revoke execute on function public.pn_take_sheet_event(uuid) from public;
grant execute on function public.pn_take_sheet_event(uuid) to anon, authenticated;

-- Заказы теперь создаются только через pn_create_order (цены и скидка — на сервере)
revoke insert on public.pn_orders from anon, authenticated;
drop policy if exists "insert_orders" on public.pn_orders;

-- ===== 20261101090000_role_links.sql =====
/*
  Pelta Nera — закрытые Telegram-каналы для ролей (VIP, CEO).
  Ссылки задаются в Google-таблице, лист «Roles PeltaNera», колонка «Ссылка на закрытый канал».
  Видны в профиле только клиентам с этой ролью (или выше). Запустите в SQL Editor → Run.
*/
alter table public.pn_tier_links add column if not exists role_code text references public.pn_tiers (code) on delete cascade;
create unique index if not exists pn_tier_links_role_idx on public.pn_tier_links (role_code) where role_code is not null;

-- Сменить ссылку роли (только скрипт таблицы с секретным ключом). Пустая ссылка — убрать.
create or replace function public.pn_sheet_set_link(p_key text, p_role text, p_url text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role text := lower(btrim(coalesce(p_role, '')));
  v_url text := btrim(coalesce(p_url, ''));
  v_rank int;
  v_title text;
begin
  if not public.pn_sheet_key_ok(p_key) then return 'bad_key'; end if;
  select t.rank, t.title_en into v_rank, v_title from public.pn_tiers t where t.code = v_role and t.min_orders is null;
  if v_rank is null then return 'bad_role'; end if;
  if v_url = '' then
    delete from public.pn_tier_links where role_code = v_role;
    return 'ok';
  end if;
  if v_url !~ '^https://(t\.me|telegram\.me)/[A-Za-z0-9_+\-/]{2,100}$' then return 'bad_url'; end if;
  insert into public.pn_tier_links (min_rank, title, url, role_code) values (v_rank, 'Telegram ' || v_title, v_url, v_role)
  on conflict (role_code) where role_code is not null
  do update set url = excluded.url, min_rank = excluded.min_rank, title = excluded.title;
  return 'ok';
end;
$$;
revoke execute on function public.pn_sheet_set_link(text, text, text) from public;
grant execute on function public.pn_sheet_set_link(text, text, text) to anon;

-- Для листа ролей: текущие роли, скидки и ссылки (только скрипт таблицы)
create or replace function public.pn_sheet_get_roles(p_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.pn_sheet_key_ok(p_key) then return null; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'title', t.title_en, 'rank', t.rank,
            'discount', t.discount_pct, 'url', l.url) order by t.rank), '[]'::jsonb)
            from public.pn_tiers t left join public.pn_tier_links l on l.role_code = t.code
           where t.min_orders is null);
end;
$$;
revoke execute on function public.pn_sheet_get_roles(text) from public;
grant execute on function public.pn_sheet_get_roles(text) to anon;


-- ===== 20261102090000_tiers_from_sheet.sql =====
/*
  Pelta Nera — скидки и пороги уровней меняются из Google-таблицы (лист «Roles PeltaNera»).
  Запустите в SQL Editor → Run. Можно запускать повторно.
*/

-- Изменить скидку (и порог покупок для уровня). Только скрипт таблицы с секретным ключом.
create or replace function public.pn_sheet_set_tier(p_key text, p_code text, p_discount numeric, p_min_orders int)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code text := lower(btrim(coalesce(p_code, '')));
  v_is_level boolean;
begin
  if not public.pn_sheet_key_ok(p_key) then return 'bad_key'; end if;
  select t.min_orders is not null into v_is_level from public.pn_tiers t where t.code = v_code;
  if v_is_level is null then return 'bad_role'; end if;
  if p_discount is null or p_discount < 0 or p_discount > 90 then return 'bad_discount'; end if;
  if v_is_level and (p_min_orders is null or p_min_orders < 0 or p_min_orders > 10000) then return 'bad_orders'; end if;
  if v_code = 'member' and p_min_orders <> 0 then return 'bad_orders'; end if;
  update public.pn_tiers
     set discount_pct = round(p_discount, 2),
         min_orders = case when v_is_level then p_min_orders else null end
   where code = v_code;
  return 'ok';
end;
$$;
revoke execute on function public.pn_sheet_set_tier(text, text, numeric, int) from public;
grant execute on function public.pn_sheet_set_tier(text, text, numeric, int) to anon;

-- Все уровни и роли для листа (только скрипт таблицы)
create or replace function public.pn_sheet_get_roles(p_key text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.pn_sheet_key_ok(p_key) then return null; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object('code', t.code, 'title', t.title_en, 'rank', t.rank,
            'discount', t.discount_pct, 'min_orders', t.min_orders, 'url', l.url) order by t.rank), '[]'::jsonb)
            from public.pn_tiers t left join public.pn_tier_links l on l.role_code = t.code);
end;
$$;
revoke execute on function public.pn_sheet_get_roles(text) from public;
grant execute on function public.pn_sheet_get_roles(text) to anon;


-- ===== 20261103090000_named_levels_independent_roles.sql =====
/*
  Pelta Nera — уровни Member / Silver / Gold / Brilliant (по выполненным покупкам)
  и роли VIP / CEO отдельно от уровней.

  - Уровень растёт сам по выполненным заказам, у VIP и CEO тоже.
  - Роль VIP / CEO назначается в таблице и от покупок не зависит.
  - Скидка клиента = большая из двух: скидка уровня или скидка роли.
  - Названия везде на английском.
  Запустите в SQL Editor → Run. Можно запускать повторно.
*/

-- 1. Коды и названия уровней ---------------------------------------------------
do $$
declare
  r record;
begin
  for r in select * from (values ('level1', 'silver', 'Silver'), ('level2', 'gold', 'Gold'), ('level3', 'brilliant', 'Brilliant'))
                 as v(old_code, new_code, title) loop
    if exists (select 1 from public.pn_tiers where code = r.old_code)
       and not exists (select 1 from public.pn_tiers where code = r.new_code)
       and not exists (select 1 from public.pn_user_roles where role_code = r.old_code)
       and not exists (select 1 from public.pn_tier_links where role_code = r.old_code) then
      update public.pn_tiers set code = r.new_code where code = r.old_code;
    end if;
    update public.pn_tiers set title_en = r.title, title_ru = r.title, title_uz = r.title where code = r.new_code;
  end loop;
end $$;
update public.pn_tiers set title_ru = title_en, title_uz = title_en;

-- 2. Статус: уровень и роль отдельно --------------------------------------------
create or replace function public.pn_status_of(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_rank int := public.pn_rank_of(p_user);
  v_done int := (select count(*) from public.pn_orders o where o.user_id = p_user and o.status = 'done');
  v_role text := (select r.role_code from public.pn_user_roles r where r.user_id = p_user);
  v_level jsonb;
  v_role_tier jsonb;
  v_next jsonb;
  v_disc numeric;
begin
  select to_jsonb(t) into v_level from public.pn_tiers t
   where t.min_orders is not null and t.min_orders <= v_done
   order by t.rank desc limit 1;
  select to_jsonb(t) into v_role_tier from public.pn_tiers t where t.code = v_role;
  select to_jsonb(t) into v_next from public.pn_tiers t
   where t.min_orders is not null and t.min_orders > v_done
   order by t.min_orders limit 1;
  v_disc := greatest(coalesce((v_level->>'discount_pct')::numeric, 0), coalesce((v_role_tier->>'discount_pct')::numeric, 0));
  return jsonb_build_object('rank', v_rank, 'tier', v_level, 'role', v_role, 'role_tier', v_role_tier,
                            'discount_pct', v_disc, 'done_orders', v_done, 'next', v_next);
end;
$$;
revoke execute on function public.pn_status_of(uuid) from public, anon, authenticated;

-- 3. Заказ: та же скидка (большая из уровня и роли) -----------------------------
create or replace function public.pn_create_order(p jsonb)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_phone text;
  v_name text;
  v_rank int;
  v_status jsonb;
  v_disc numeric;
  v_tier text;
  v_item jsonb;
  v_prod record;
  v_qty int;
  v_unit numeric;
  v_lines jsonb := '[]'::jsonb;
  v_total numeric := 0;
  v_id bigint;
  v_tg text := nullif(btrim(coalesce(p->>'telegram', '')), '');
  v_addr text := nullif(btrim(coalesce(p->>'address', '')), '');
  v_comment text := nullif(btrim(coalesce(p->>'comment', '')), '');
  v_lang text := coalesce(nullif(p->>'lang', ''), 'en');
begin
  if v_uid is null then raise exception 'auth_required' using errcode = 'P0001'; end if;

  select '+' || regexp_replace(u.phone, '[^0-9]', '', 'g') into v_phone
    from auth.users u where u.id = v_uid and u.phone_confirmed_at is not null and coalesce(u.phone, '') <> '';
  if v_phone is null then raise exception 'phone_not_confirmed' using errcode = 'P0001'; end if;

  select nullif(btrim(coalesce(pr.full_name, '')), '') into v_name from public.profiles pr where pr.id = v_uid;
  if v_name is null or char_length(v_name) < 2 then raise exception 'name_required' using errcode = 'P0001'; end if;

  if (select count(*) from public.pn_orders o where o.user_id = v_uid and o.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') not between 1 and 50 then
    raise exception 'items_invalid' using errcode = 'P0001';
  end if;

  v_rank := public.pn_rank_of(v_uid);
  v_status := public.pn_status_of(v_uid);
  v_disc := coalesce((v_status->>'discount_pct')::numeric, 0);
  v_tier := concat_ws(' + ', v_status->'tier'->>'code', v_status->'role_tier'->>'code');

  for v_item in select * from jsonb_array_elements(p->'items') loop
    select * into v_prod from public.pn_products pp where pp.id = v_item->>'id' and pp.active;
    if v_prod.id is null or v_rank < v_prod.min_rank then
      raise exception 'item_unavailable' using errcode = 'P0001';
    end if;
    v_qty := least(greatest(coalesce((v_item->>'quantity')::int, 1), 1), 99);
    v_unit := round(v_prod.price * (100 - v_disc) / 100);
    v_total := v_total + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'id', v_prod.id, 'quantity', v_qty, 'price', v_prod.price, 'unit', v_unit, 'line_total', v_unit * v_qty,
      'color', left(coalesce(v_item->>'color', ''), 40), 'name', left(coalesce(v_item->>'name', v_prod.name_en, v_prod.id), 80));
  end loop;

  if v_tg is not null and v_tg !~ '^@[A-Za-z0-9_](?:[A-Za-z0-9_]|\.(?!\.))*[A-Za-z0-9_]$' then v_tg := null; end if;
  if v_addr is not null and char_length(v_addr) < 3 then v_addr := null; end if;

  insert into public.pn_orders (name, phone, address, comment, items, total, lang, telegram, status)
  values (left(v_name, 60), v_phone, left(v_addr, 200), left(v_comment, 500), v_lines, v_total,
          case when v_lang in ('en', 'ru', 'uz') then v_lang else 'en' end, left(v_tg, 31), 'new')
  returning id into v_id;

  return jsonb_build_object('id', v_id, 'total', v_total, 'discount_pct', v_disc, 'tier', v_tier,
                            'name', v_name, 'phone', v_phone, 'lines', v_lines);
end;
$$;
revoke execute on function public.pn_create_order(jsonb) from public, anon;
grant execute on function public.pn_create_order(jsonb) to authenticated;


-- =====================================================================
-- 20261104090000_security_and_legal.sql
-- =====================================================================
/*
  Pelta Nera — безопасность и требования закона (29.10.2026).
  Запустите целиком: SQL Editor → New query → вставить → Run. Можно запускать повторно.

  1. Защита форм от спама по IP. Сообщения: не больше 3 за 10 минут с одного адреса и
     30 в час со всего сайта. Подписка: 3 за 10 минут и 60 в час. Сам IP не хранится —
     только хеш с секретной солью, записи удаляются через сутки.
  2. Сообщения с сайта идут только через базу: она передаёт их скрипту Google одноразовым
     событием (как клиентов и подписчиков). Отправить спам прямо в канал, минуя лимиты, нельзя.
  3. Удаление аккаунта самим клиентом (pn_delete_my_account): аккаунт, профиль, роль и
     подписка удаляются сразу, строка клиента в Google-таблице очищается. Заказы остаются
     без привязки к аккаунту: их нужно хранить для учёта продаж.
  4. Вход через бота: проверочное число (защита от входа по чужой ссылке, см. функцию бота).
  5. Цены в сумах: долларовые цены переводятся по курсу ЦБ 11 903,15 сум (29.10.2026)
     с округлением до 10 000. Повторный запуск цены не меняет (переводятся только цены < 10 000).
*/

-- 1. ЛИМИТЫ ПО IP ------------------------------------------------------------
create table if not exists public.pn_secrets (
  name text primary key,
  value text not null
);
alter table public.pn_secrets enable row level security;
revoke all on public.pn_secrets from anon, authenticated;
insert into public.pn_secrets (name, value)
values ('rate_salt', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (name) do nothing;

create table if not exists public.pn_rate_events (
  id bigint generated always as identity primary key,
  kind text not null,
  ip_hash text not null,
  created_at timestamptz not null default now()
);
create index if not exists pn_rate_events_kind_idx on public.pn_rate_events (kind, created_at desc);
create index if not exists pn_rate_events_time_idx on public.pn_rate_events (created_at);
alter table public.pn_rate_events enable row level security;
revoke all on public.pn_rate_events from anon, authenticated;

-- IP посетителя из заголовков запроса (PostgREST передаёт их в request.headers)
create or replace function public.pn_client_ip()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  h json;
begin
  begin
    h := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    h := null;
  end;
  if h is null then return null; end if;
  return coalesce(
    nullif(btrim(h->>'cf-connecting-ip'), ''),
    nullif(btrim(h->>'x-real-ip'), ''),
    nullif(btrim(split_part(coalesce(h->>'x-forwarded-for', ''), ',', 1)), '')
  );
end;
$$;
revoke execute on function public.pn_client_ip() from public, anon, authenticated;

create or replace function public.pn_rate_guard(p_kind text, p_per_ip int, p_global int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ip text := public.pn_client_ip();
  v_hash text;
  v_from_ip int;
  v_all int;
begin
  delete from public.pn_rate_events where created_at < now() - interval '1 day';
  v_hash := case when v_ip is null then 'unknown' else
    encode(extensions.digest(v_ip || ':' || coalesce((select s.value from public.pn_secrets s where s.name = 'rate_salt'), ''), 'sha256'), 'hex') end;

  select count(*) filter (where e.ip_hash = v_hash and e.created_at > now() - interval '10 minutes'),
         count(*)
    into v_from_ip, v_all
    from public.pn_rate_events e
   where e.kind = p_kind and e.created_at > now() - interval '1 hour';

  if (v_ip is not null and v_from_ip >= p_per_ip) or v_all >= p_global then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.pn_rate_events (kind, ip_hash) values (p_kind, v_hash);
end;
$$;
revoke execute on function public.pn_rate_guard(text, int, int) from public, anon, authenticated;

create or replace function public.pn_rate_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_table_name = 'pn_contact_messages' then
    perform public.pn_rate_guard('contact', 3, 30);
  elsif tg_table_name = 'pn_newsletter' then
    perform public.pn_rate_guard('newsletter', 3, 60);
  end if;
  return new;
end;
$$;
revoke execute on function public.pn_rate_on_insert() from public, anon, authenticated;

drop trigger if exists pn_rate_contact on public.pn_contact_messages;
create trigger pn_rate_contact before insert on public.pn_contact_messages
  for each row execute function public.pn_rate_on_insert();
drop trigger if exists pn_rate_newsletter on public.pn_newsletter;
create trigger pn_rate_newsletter before insert on public.pn_newsletter
  for each row execute function public.pn_rate_on_insert();

-- 2. СООБЩЕНИЯ И УДАЛЕНИЕ → СКРИПТ GOOGLE ------------------------------------
alter table public.pn_sheet_events add column if not exists message_id bigint;
alter table public.pn_sheet_events drop constraint if exists pn_sheet_events_kind_check;
alter table public.pn_sheet_events add constraint pn_sheet_events_kind_check
  check (kind in ('code', 'confirmed', 'name', 'profile', 'newsletter', 'contact', 'deleted'));

create or replace function public.pn_sheet_on_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  insert into public.pn_sheet_events (message_id, kind) values (new.id, 'contact') returning id into v_id;
  perform public.pn_sheet_post(v_id);
  return new;
exception when others then
  return new;
end;
$$;
revoke execute on function public.pn_sheet_on_contact() from public, anon, authenticated;

drop trigger if exists pn_sheet_contact_insert on public.pn_contact_messages;
create trigger pn_sheet_contact_insert
  after insert on public.pn_contact_messages
  for each row execute function public.pn_sheet_on_contact();

-- Скрипт Google забирает данные события (один раз, не позже чем через час)
create or replace function public.pn_take_sheet_event(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev record;
  out jsonb;
  st jsonb;
begin
  delete from public.pn_sheet_events
   where id = p_id and created_at > now() - interval '1 hour'
  returning user_id, newsletter_id, message_id, kind into ev;
  if ev.kind is null then
    return null;
  end if;

  if ev.kind = 'newsletter' then
    select jsonb_build_object('kind', 'newsletter', 'id', n.id, 'created_at', n.created_at,
                              'email', n.email, 'prefs', n.prefs, 'lang', n.lang)
      into out from public.pn_newsletter n where n.id = ev.newsletter_id;
    return out;
  end if;

  if ev.kind = 'contact' then
    select jsonb_build_object('kind', 'contact', 'id', m.id, 'created_at', m.created_at,
                              'name', m.name, 'phone', m.phone, 'email', m.email,
                              'message', m.message, 'lang', m.lang, 'user_id', m.user_id)
      into out from public.pn_contact_messages m where m.id = ev.message_id;
    return out;
  end if;

  if ev.kind = 'deleted' then
    return jsonb_build_object('kind', 'deleted', 'id', ev.user_id, 'newsletter_id', ev.newsletter_id);
  end if;

  st := public.pn_status_of(ev.user_id);
  select jsonb_build_object(
           'kind', ev.kind,
           'id', u.id,
           'created_at', u.created_at,
           'phone', case when coalesce(u.phone, '') = '' then null else '+' || regexp_replace(u.phone, '[^0-9]', '', 'g') end,
           'confirmed', u.phone_confirmed_at is not null,
           'confirmed_at', u.phone_confirmed_at,
           'last_code_at', u.confirmation_sent_at,
           'name', p.full_name,
           'prefs', coalesce(p.prefs, '{}'),
           'marketing', coalesce(p.marketing, false),
           'role', coalesce(st->>'role', ''),
           'level', st->'tier'->>'title_ru',
           'done_orders', (st->>'done_orders')::int
         )
    into out
    from auth.users u
    left join public.profiles p on p.id = u.id
   where u.id = ev.user_id;
  return out;
end;
$$;
revoke execute on function public.pn_take_sheet_event(uuid) from public;
grant execute on function public.pn_take_sheet_event(uuid) to anon, authenticated;

-- 3. УДАЛЕНИЕ АККАУНТА САМИМ КЛИЕНТОМ ----------------------------------------
create or replace function public.pn_delete_my_account()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_emails text[];
  v_news bigint;
  v_event uuid;
begin
  if v_uid is null then
    raise exception 'auth_required' using errcode = 'P0001';
  end if;

  select array_remove(array[lower(nullif(p.email, '')), lower(nullif(u.email, ''))], null)
    into v_emails
    from auth.users u
    left join public.profiles p on p.id = u.id
   where u.id = v_uid;
  if v_emails is not null and cardinality(v_emails) > 0 then
    with d as (delete from public.pn_newsletter where lower(email) = any (v_emails) returning id)
    select min(id) into v_news from d;
  end if;

  -- Неотправленные события с данными клиента больше не нужны
  delete from public.pn_sheet_events where user_id = v_uid;
  insert into public.pn_sheet_events (user_id, newsletter_id, kind) values (v_uid, v_news, 'deleted')
  returning id into v_event;

  -- Профиль, роль и сеансы удаляются каскадом; в заказах и сообщениях ссылка на аккаунт обнуляется
  delete from auth.users where id = v_uid;

  perform public.pn_sheet_post(v_event);
  return 'ok';
end;
$$;
revoke execute on function public.pn_delete_my_account() from public, anon;
grant execute on function public.pn_delete_my_account() to authenticated;

-- 4. ВХОД ЧЕРЕЗ БОТА: ПРОВЕРОЧНОЕ ЧИСЛО --------------------------------------
alter table public.pn_login_requests add column if not exists checked boolean not null default false;
alter table public.pn_login_requests drop constraint if exists pn_login_requests_status_check;
alter table public.pn_login_requests add constraint pn_login_requests_status_check
  check (status in ('pending', 'confirmed', 'claiming', 'done', 'rejected'));

-- 5. ЦЕНЫ В СУМАХ ------------------------------------------------------------
update public.pn_products
   set price = round(price * 11903.15 / 10000) * 10000
 where price > 0 and price < 10000;
comment on column public.pn_products.price is 'Цена в сумах (UZS)';
