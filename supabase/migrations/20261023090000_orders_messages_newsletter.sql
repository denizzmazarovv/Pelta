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
