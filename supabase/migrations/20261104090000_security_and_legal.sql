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
