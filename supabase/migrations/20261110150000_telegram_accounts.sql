/*
  Pelta Nera — все Telegram-аккаунты и @ники клиента (10.11.2026).
  Запустите целиком: SQL Editor → New query → вставить → Run. Можно запускать повторно.

  - У одного аккаунта Telegram может быть несколько @ников, а клиент может писать боту с
    разных аккаунтов. Бот сохраняет их все (profiles.tg_accounts), таблица показывает все.
  - pn_bot_jobs — одноразовые ключи для разовой синхронизации старых клиентов бота
    (в базе только хеш ключа, ключ действует 1 час и один раз).
*/

-- 1. ВСЕ АККАУНТЫ TELEGRAM КЛИЕНТА ----------------------------------------------
alter table public.profiles add column if not exists tg_accounts jsonb not null default '[]'::jsonb;
alter table public.profiles drop constraint if exists profiles_tg_accounts_array;
alter table public.profiles add constraint profiles_tg_accounts_array
  check (jsonb_typeof(tg_accounts) = 'array' and jsonb_array_length(tg_accounts) <= 5);

update public.profiles
   set tg_accounts = jsonb_build_array(jsonb_build_object(
         'id', tg_id,
         'usernames', case when tg_username is null then '[]'::jsonb else jsonb_build_array(tg_username) end))
 where tg_id is not null and tg_accounts = '[]'::jsonb;

-- 2. БОТ: записать аккаунт клиента со всеми @никами -----------------------------
drop function if exists public.pn_bot_set_telegram(text, bigint, text);
create or replace function public.pn_bot_set_telegram(p_phone text, p_tg_id bigint, p_usernames text[] default '{}')
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid;
  v_digits text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
  v_names text[];
  v_old jsonb;
  v_new jsonb;
begin
  if v_digits = '' or p_tg_id is null or p_tg_id <= 0 then return false; end if;

  -- Ники без повторов (регистр не важен), в исходном порядке, не больше 10
  select coalesce(array_agg(n order by i), '{}') into v_names
    from (select (array_agg(x.n order by x.i))[1] as n, min(x.i) as i
            from unnest(coalesce(p_usernames, '{}')) with ordinality as x(n, i)
           where x.n ~ '^[A-Za-z0-9_]{3,32}$'
           group by lower(x.n)) s;
  v_names := v_names[1:10];

  select u.id into v_uid from auth.users u
   where regexp_replace(coalesce(u.phone, ''), '[^0-9]', '', 'g') = v_digits
   limit 1;
  if v_uid is null then return false; end if;

  select coalesce(pr.tg_accounts, '[]'::jsonb) into v_old from public.profiles pr where pr.id = v_uid;
  if not found then return false; end if;

  -- Этот аккаунт — в конец списка (последний активный), старые сохраняются, максимум 5
  select coalesce(jsonb_agg(a order by o), '[]'::jsonb) into v_new
    from (select a, o from jsonb_array_elements(v_old) with ordinality as e(a, o)
           where (a->>'id') is distinct from p_tg_id::text
           order by o desc limit 4) k;
  v_new := v_new || jsonb_build_array(jsonb_build_object('id', p_tg_id, 'usernames', to_jsonb(v_names)));

  update public.profiles
     set tg_id = p_tg_id,
         tg_username = v_names[1],
         tg_accounts = v_new,
         telegram = coalesce(telegram, case when v_names[1] is not null then '@' || v_names[1] end)
   where id = v_uid
     and (tg_accounts is distinct from v_new or tg_id is distinct from p_tg_id
          or tg_username is distinct from v_names[1]
          or (telegram is null and v_names[1] is not null));
  return true;
end;
$$;
revoke execute on function public.pn_bot_set_telegram(text, bigint, text[]) from public, anon, authenticated;
grant execute on function public.pn_bot_set_telegram(text, bigint, text[]) to service_role;

-- 3. GOOGLE-ТАБЛИЦА: обновлять строку клиента при смене аккаунтов ------------------
create or replace function public.pn_sheet_on_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.full_name is distinct from old.full_name
     or new.prefs is distinct from old.prefs
     or new.marketing is distinct from old.marketing
     or new.telegram is distinct from old.telegram
     or new.instagram is distinct from old.instagram
     or new.tg_id is distinct from old.tg_id
     or new.tg_username is distinct from old.tg_username
     or new.tg_accounts is distinct from old.tg_accounts then
    perform public.pn_sheet_notify(new.id, 'profile');
  end if;
  return new;
end;
$$;
revoke execute on function public.pn_sheet_on_profile() from public, anon, authenticated;
drop trigger if exists pn_sheet_profile_update on public.profiles;
create trigger pn_sheet_profile_update
  after update of full_name, prefs, marketing, telegram, instagram, tg_id, tg_username, tg_accounts on public.profiles
  for each row execute function public.pn_sheet_on_profile();

-- 4. ОДНОРАЗОВЫЕ КЛЮЧИ ДЛЯ СИНХРОНИЗАЦИИ БОТА ------------------------------------
create table if not exists public.pn_bot_jobs (
  token_hash text primary key check (char_length(token_hash) = 64),
  created_at timestamptz not null default now()
);
alter table public.pn_bot_jobs enable row level security;
revoke all on public.pn_bot_jobs from anon, authenticated;
grant select, insert, delete on public.pn_bot_jobs to service_role;
delete from public.pn_bot_jobs where created_at < now() - interval '1 day';

-- 5. ЗАКАЗ: все аккаунты клиента в ответе -----------------------------------------
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
  v_pct numeric;
  v_bal bigint;
  v_use bigint := 0;
  v_spend bigint := 0;
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
  v_prof record;
begin
  if v_uid is null then raise exception 'auth_required' using errcode = 'P0001'; end if;

  select '+' || regexp_replace(u.phone, '[^0-9]', '', 'g') into v_phone
    from auth.users u where u.id = v_uid and u.phone_confirmed_at is not null and coalesce(u.phone, '') <> '';
  if v_phone is null then raise exception 'phone_not_confirmed' using errcode = 'P0001'; end if;

  select nullif(btrim(coalesce(pr.full_name, '')), '') into v_name from public.profiles pr where pr.id = v_uid;
  if v_name is null or char_length(v_name) < 2 then raise exception 'name_required' using errcode = 'P0001'; end if;

  -- Контакты из профиля: Telegram (из бота или указанный клиентом) и Instagram
  select pr.telegram, pr.instagram, pr.tg_id, pr.tg_username, pr.tg_accounts into v_prof from public.profiles pr where pr.id = v_uid;
  if v_tg is null then v_tg := v_prof.telegram; end if;

  if (select count(*) from public.pn_orders o where o.user_id = v_uid and o.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;

  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') not between 1 and 50 then
    raise exception 'items_invalid' using errcode = 'P0001';
  end if;

  v_rank := public.pn_rank_of(v_uid);
  v_status := public.pn_status_of(v_uid);
  v_pct := coalesce((v_status->>'points_pct')::numeric, 0);
  v_tier := concat_ws(' + ', v_status->'tier'->>'code', v_status->'role_tier'->>'code');

  for v_item in select * from jsonb_array_elements(p->'items') loop
    select * into v_prod from public.pn_products pp where pp.id = v_item->>'id' and pp.active;
    if v_prod.id is null or v_rank < v_prod.min_rank then
      raise exception 'item_unavailable' using errcode = 'P0001';
    end if;
    v_qty := least(greatest(coalesce((v_item->>'quantity')::int, 1), 1), 99);
    v_unit := v_prod.price;
    v_total := v_total + v_unit * v_qty;
    v_lines := v_lines || jsonb_build_object(
      'id', v_prod.id, 'quantity', v_qty, 'price', v_prod.price, 'unit', v_unit, 'line_total', v_unit * v_qty,
      'color', left(coalesce(v_item->>'color', ''), 40), 'name', left(coalesce(v_item->>'name', v_prod.name_en, v_prod.id), 80));
  end loop;

  if v_tg is not null and v_tg !~ '^@[A-Za-z0-9_](?:[A-Za-z0-9_]|\.(?!\.))*[A-Za-z0-9_]$' then v_tg := null; end if;
  if v_addr is not null and char_length(v_addr) < 3 then v_addr := null; end if;

  -- Баллы: списать можно не больше остатка и не больше разрешённой доли заказа
  perform pg_advisory_xact_lock(hashtext('pn_points:' || v_uid::text));
  perform public.pn_points_settle(v_uid);
  v_bal := coalesce((public.pn_points_of(v_uid)->>'points')::bigint, 0);
  if coalesce(p->>'use_points', '') ~ '^[0-9]{1,12}$' then v_use := (p->>'use_points')::bigint; end if;
  v_spend := greatest(least(v_use, v_bal, floor(v_total * public.pn_points_max_share())::bigint), 0);

  insert into public.pn_orders (name, phone, address, comment, items, total, lang, telegram, status, points_spent, points_pct)
  values (left(v_name, 60), v_phone, left(v_addr, 200), left(v_comment, 500), v_lines, v_total - v_spend,
          case when v_lang in ('en', 'ru', 'uz') then v_lang else 'en' end, left(v_tg, 31), 'new', v_spend, v_pct)
  returning id into v_id;

  if v_spend > 0 then
    insert into public.pn_points_ledger (user_id, order_id, kind, delta) values (v_uid, v_id, 'spend', -v_spend);
  end if;

  return jsonb_build_object('id', v_id, 'total', v_total - v_spend, 'subtotal', v_total, 'points_spent', v_spend,
                            'points_pct', v_pct, 'discount_pct', 0, 'tier', v_tier,
                            'name', v_name, 'phone', v_phone, 'lines', v_lines,
                            'telegram', v_tg, 'instagram', v_prof.instagram,
                            'tg_id', v_prof.tg_id, 'tg_username', v_prof.tg_username,
                            'tg_accounts', coalesce(v_prof.tg_accounts, '[]'::jsonb));
end;
$$;
revoke execute on function public.pn_create_order(jsonb) from public, anon;
grant execute on function public.pn_create_order(jsonb) to authenticated;

-- 6. ДАННЫЕ ДЛЯ ТАБЛИЦЫ: все аккаунты в строке клиента ---------------------------
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
           'done_orders', (st->>'done_orders')::int,
           'points', coalesce((st->>'points')::bigint, 0),
           'telegram', p.telegram,
           'instagram', p.instagram,
           'tg_id', p.tg_id,
           'tg_username', p.tg_username,
           'tg_accounts', coalesce(p.tg_accounts, '[]'::jsonb)
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
