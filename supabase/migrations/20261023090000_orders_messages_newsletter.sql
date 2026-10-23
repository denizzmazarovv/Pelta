/*
  Pelta Nera — заказы, сообщения и подписки хранятся в Supabase (вместо Google Таблиц).
  Запустите целиком: SQL Editor → New query → вставить → Run. Можно запускать повторно.

  Защита:
  - Сайт (anon / authenticated) может только ДОБАВЛЯТЬ строки. Читать, менять и удалять
    чужие данные с сайта нельзя. Смотреть всё можно только вам в панели Supabase
    (Table Editor), там права администратора.
  - Клиент, вошедший в аккаунт, видит только свои заказы.
  - Ограничения длины и формата полей проверяются в самой базе.
  - Защита от спама: не больше 5 записей с одного телефона/email за 10 минут.
*/

-- ЗАКАЗЫ ------------------------------------------------------------------
create table if not exists public.orders (
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
create table if not exists public.contact_messages (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id uuid references auth.users(id) on delete set null default auth.uid(),
  name text not null check (char_length(name) between 2 and 60),
  phone text check (phone is null or phone ~ '^\+?[0-9]{9,15}$'),
  email text check (email is null or (char_length(email) <= 120 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  message text not null check (char_length(message) between 2 and 500),
  lang text check (lang in ('en', 'ru', 'uz')),
  constraint contact_has_channel check (phone is not null or email is not null)
);

-- РАССЫЛКА ----------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
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

drop trigger if exists orders_own_user on public.orders;
create trigger orders_own_user before insert on public.orders
  for each row execute function public.force_own_user_id();

drop trigger if exists contact_own_user on public.contact_messages;
create trigger contact_own_user before insert on public.contact_messages
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
  if tg_table_name = 'orders' then
    select count(*) into n from public.orders
     where created_at > now() - interval '10 minutes'
       and (phone = new.phone or (new.email is not null and email = new.email));
  else
    select count(*) into n from public.contact_messages
     where created_at > now() - interval '10 minutes'
       and ((new.phone is not null and phone = new.phone) or (new.email is not null and email = new.email));
  end if;
  if n >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists orders_limit_spam on public.orders;
create trigger orders_limit_spam before insert on public.orders
  for each row execute function public.limit_spam();

drop trigger if exists contact_limit_spam on public.contact_messages;
create trigger contact_limit_spam before insert on public.contact_messages
  for each row execute function public.limit_spam();

revoke execute on function public.limit_spam() from public, anon, authenticated;

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_user_idx on public.orders (user_id);
create index if not exists contact_created_idx on public.contact_messages (created_at desc);

-- RLS и права -------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;

revoke all on public.orders, public.contact_messages, public.newsletter_subscribers from anon, authenticated;

grant insert (name, phone, email, address, comment, items, total, lang) on public.orders to anon, authenticated;
grant insert (name, phone, email, message, lang) on public.contact_messages to anon, authenticated;
grant insert (email, prefs, lang) on public.newsletter_subscribers to anon, authenticated;
grant select on public.orders to authenticated;

drop policy if exists "insert_orders" on public.orders;
create policy "insert_orders" on public.orders for insert to anon, authenticated with check (true);

drop policy if exists "select_own_orders" on public.orders;
create policy "select_own_orders" on public.orders for select to authenticated
  using (user_id is not null and user_id = (select auth.uid()));

drop policy if exists "insert_messages" on public.contact_messages;
create policy "insert_messages" on public.contact_messages for insert to anon, authenticated with check (true);

drop policy if exists "insert_newsletter" on public.newsletter_subscribers;
create policy "insert_newsletter" on public.newsletter_subscribers for insert to anon, authenticated with check (true);
