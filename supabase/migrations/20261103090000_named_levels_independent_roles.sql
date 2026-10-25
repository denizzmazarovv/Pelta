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
