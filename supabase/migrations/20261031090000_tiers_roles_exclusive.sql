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
