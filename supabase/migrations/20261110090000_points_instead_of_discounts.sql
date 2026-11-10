/*
  Pelta Nera — баллы вместо скидок (10.11.2026).
  Запустите целиком: SQL Editor → New query → вставить → Run. Можно запускать повторно.

  - Цена для всех одна, скидок по уровню и роли больше нет.
  - За выполненный заказ (статус «Выполнен») клиент получает баллы: процент от оплаченной суммы.
    Процент — тот, что указан у уровня или роли в листе «Roles PeltaNera» (берётся больший).
  - Баллами можно уменьшить цену следующего заказа: 1 балл = 1 сум, не больше половины заказа
    (долю задаёт pn_points_max_share()).
  - Баллы сгорают через 12 месяцев без выполненных покупок.
  - Заказ отменён — списанные баллы возвращаются. Заказ перестал быть «Выполнен» — начисление снимается.
  - Баллы — не деньги: их нельзя вывести, передать или купить; это право на скидку (см. оферту).
  - Все движения баллов — в таблице pn_points_ledger (история не стирается).
*/

-- 1. ТАБЛИЦЫ ------------------------------------------------------------------
alter table public.pn_orders add column if not exists points_spent bigint not null default 0 check (points_spent >= 0);
alter table public.pn_orders add column if not exists points_pct numeric not null default 0;

create table if not exists public.pn_points_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  order_id bigint references public.pn_orders (id) on delete set null,
  kind text not null check (kind in ('earn', 'spend', 'refund', 'expire', 'adjust')),
  delta bigint not null,
  created_at timestamptz not null default now()
);
create index if not exists pn_points_ledger_user_idx on public.pn_points_ledger (user_id, created_at desc);
create index if not exists pn_points_ledger_order_idx on public.pn_points_ledger (order_id);
alter table public.pn_points_ledger enable row level security;
revoke all on public.pn_points_ledger from anon, authenticated;
grant select on public.pn_points_ledger to authenticated;
drop policy if exists "own_points" on public.pn_points_ledger;
create policy "own_points" on public.pn_points_ledger for select to authenticated using (user_id = auth.uid());

-- Какую долю заказа можно закрыть баллами (0.5 = половину)
create or replace function public.pn_points_max_share()
returns numeric language sql immutable set search_path = '' as $$ select 0.5::numeric $$;

-- 2. ОСТАТОК И СГОРАНИЕ -------------------------------------------------------
create or replace function public.pn_points_of(p_user uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sum bigint;
  v_last timestamptz;
begin
  select coalesce(sum(l.delta), 0), max(l.created_at) filter (where l.kind in ('earn', 'adjust'))
    into v_sum, v_last
    from public.pn_points_ledger l where l.user_id = p_user;
  if v_last is null or v_last < now() - interval '12 months' or v_sum <= 0 then
    return jsonb_build_object('points', 0, 'points_expire_at', null);
  end if;
  return jsonb_build_object('points', v_sum, 'points_expire_at', v_last + interval '12 months');
end;
$$;
revoke execute on function public.pn_points_of(uuid) from public, anon, authenticated;

-- Записать сгорание, если 12 месяцев не было выполненных покупок
create or replace function public.pn_points_settle(p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sum bigint;
  v_last timestamptz;
begin
  select coalesce(sum(l.delta), 0), max(l.created_at) filter (where l.kind in ('earn', 'adjust'))
    into v_sum, v_last
    from public.pn_points_ledger l where l.user_id = p_user;
  if v_sum > 0 and (v_last is null or v_last < now() - interval '12 months') then
    insert into public.pn_points_ledger (user_id, kind, delta) values (p_user, 'expire', -v_sum);
  end if;
end;
$$;
revoke execute on function public.pn_points_settle(uuid) from public, anon, authenticated;

-- 3. НАЧИСЛЕНИЕ И ВОЗВРАТ ПРИ СМЕНЕ СТАТУСА ЗАКАЗА -----------------------------
create or replace function public.pn_points_on_order()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is null or new.status is not distinct from old.status then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtext('pn_points:' || new.user_id::text));

  -- Начисление: только пока заказ «Выполнен»
  delete from public.pn_points_ledger where order_id = new.id and kind = 'earn';
  if new.status = 'done' then
    perform public.pn_points_settle(new.user_id);
    insert into public.pn_points_ledger (user_id, order_id, kind, delta)
    values (new.user_id, new.id, 'earn', round(new.total * coalesce(new.points_pct, 0) / 100));
  end if;

  -- Возврат списанных баллов: только пока заказ «Отменён»
  if new.status = 'cancelled' then
    if new.points_spent > 0 and not exists (select 1 from public.pn_points_ledger where order_id = new.id and kind = 'refund') then
      insert into public.pn_points_ledger (user_id, order_id, kind, delta) values (new.user_id, new.id, 'refund', new.points_spent);
    end if;
  elsif old.status = 'cancelled' then
    delete from public.pn_points_ledger where order_id = new.id and kind = 'refund';
  end if;
  return new;
end;
$$;
revoke execute on function public.pn_points_on_order() from public, anon, authenticated;
-- Имя начинается с «pn_a…», чтобы сработать раньше триггера, который обновляет Google-таблицу
drop trigger if exists pn_a_points_order_status on public.pn_orders;
create trigger pn_a_points_order_status after update of status on public.pn_orders
  for each row execute function public.pn_points_on_order();

-- 4. СТАТУС КЛИЕНТА: баллы вместо скидки ---------------------------------------
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
  v_pct numeric;
begin
  select to_jsonb(t) into v_level from public.pn_tiers t
   where t.min_orders is not null and t.min_orders <= v_done
   order by t.rank desc limit 1;
  select to_jsonb(t) into v_role_tier from public.pn_tiers t where t.code = v_role;
  select to_jsonb(t) into v_next from public.pn_tiers t
   where t.min_orders is not null and t.min_orders > v_done
   order by t.min_orders limit 1;
  -- pn_tiers.discount_pct теперь означает «процент баллов»; действует больший из уровня и роли
  v_pct := greatest(coalesce((v_level->>'discount_pct')::numeric, 0), coalesce((v_role_tier->>'discount_pct')::numeric, 0));
  return jsonb_build_object('rank', v_rank, 'tier', v_level, 'role', v_role, 'role_tier', v_role_tier,
                            'discount_pct', 0, 'points_pct', v_pct, 'points_max_share', public.pn_points_max_share(),
                            'done_orders', v_done, 'next', v_next)
         || public.pn_points_of(p_user);
end;
$$;
revoke execute on function public.pn_status_of(uuid) from public, anon, authenticated;
comment on column public.pn_tiers.discount_pct is 'Процент баллов с оплаченной суммы выполненного заказа (не скидка)';

-- 5. ЗАКАЗ: цена без скидок, часть можно закрыть баллами ------------------------
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
                            'name', v_name, 'phone', v_phone, 'lines', v_lines);
end;
$$;
revoke execute on function public.pn_create_order(jsonb) from public, anon;
grant execute on function public.pn_create_order(jsonb) to authenticated;

-- 6. GOOGLE-ТАБЛИЦА: баллы в строке клиента, ручная правка из таблицы -----------
create or replace function public.pn_sheet_set_points(p_key text, p_user uuid, p_points bigint)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_sum bigint;
begin
  if not public.pn_sheet_key_ok(p_key) then return 'bad_key'; end if;
  if p_points is null or p_points < 0 or p_points > 1000000000 then return 'bad_points'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user) then return 'no_user'; end if;
  perform pg_advisory_xact_lock(hashtext('pn_points:' || p_user::text));
  perform public.pn_points_settle(p_user);
  select coalesce(sum(l.delta), 0) into v_sum from public.pn_points_ledger l where l.user_id = p_user;
  if p_points <> v_sum then
    insert into public.pn_points_ledger (user_id, kind, delta) values (p_user, 'adjust', p_points - v_sum);
  end if;
  return 'ok';
end;
$$;
revoke execute on function public.pn_sheet_set_points(text, uuid, bigint) from public;
grant execute on function public.pn_sheet_set_points(text, uuid, bigint) to anon;

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
           'done_orders', (st->>'done_orders')::int,
           'points', coalesce((st->>'points')::bigint, 0)
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
