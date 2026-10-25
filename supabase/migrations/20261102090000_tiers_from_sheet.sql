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
