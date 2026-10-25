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
