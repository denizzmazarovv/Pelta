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
