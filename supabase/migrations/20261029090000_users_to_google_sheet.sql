/*
  Pelta Nera — список клиентов в Google-таблице и уведомление о новом клиенте в канал.
  Запустите в SQL Editor → Run. Можно запускать повторно.

  Как работает:
  1. При событии (запрошен код, номер подтверждён, клиент сохранил имя) база создаёт
     одноразовое событие со случайным ID и отправляет этот ID скрипту Google (pg_net).
  2. Скрипт Google забирает данные по ID через pn_take_sheet_event() и обновляет строку
     клиента в листе «Users PeltaNera». Для нового подтверждённого клиента бот пишет в канал.
  3. Событие срабатывает один раз и живёт не дольше часа — подделать запись в таблице,
     зная только адрес скрипта, нельзя.
*/
create extension if not exists pg_net;

create table if not exists public.pn_sheet_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kind text not null check (kind in ('code', 'confirmed', 'name')),
  created_at timestamptz not null default now()
);
alter table public.pn_sheet_events enable row level security;
revoke all on public.pn_sheet_events from anon, authenticated;

-- Адрес скрипта Google (тот же, что принимает заказы)
create or replace function public.pn_sheet_url()
returns text
language sql
immutable
set search_path = ''
as $$
  select 'https://script.google.com/macros/s/AKfycbwcTc8QsfEVx3440DozhVa7sbB5ZZRbgRN2iI2BMxCRuihZS72EZQCXfd1C_eZd7Nm7Jw/exec'::text
$$;

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
  perform net.http_post(
    url := public.pn_sheet_url(),
    body := jsonb_build_object('event_id', v_id),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
exception when others then
  -- Таблица — дополнительный учёт: её сбой не должен мешать входу на сайт
  null;
end;
$$;
revoke execute on function public.pn_sheet_notify(uuid, text) from public, anon, authenticated;

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
begin
  delete from public.pn_sheet_events
   where id = p_id and created_at > now() - interval '1 hour'
  returning user_id, kind into ev;
  if ev.user_id is null then
    return null;
  end if;

  select jsonb_build_object(
           'kind', ev.kind,
           'id', u.id,
           'created_at', u.created_at,
           'phone', case when coalesce(u.phone, '') = '' then null else '+' || regexp_replace(u.phone, '[^0-9]', '', 'g') end,
           'confirmed', u.phone_confirmed_at is not null,
           'confirmed_at', u.phone_confirmed_at,
           'last_code_at', u.confirmation_sent_at,
           'name', p.full_name
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

-- События аккаунта
create or replace function public.pn_sheet_on_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.phone, '') = '' then
    return new;
  end if;
  if tg_op = 'INSERT' then
    perform public.pn_sheet_notify(new.id, case when new.phone_confirmed_at is not null then 'confirmed' else 'code' end);
  else
    if old.phone_confirmed_at is null and new.phone_confirmed_at is not null then
      perform public.pn_sheet_notify(new.id, 'confirmed');
    elsif new.confirmation_sent_at is distinct from old.confirmation_sent_at and new.confirmation_sent_at is not null then
      perform public.pn_sheet_notify(new.id, 'code');
    end if;
  end if;
  return new;
end;
$$;
revoke execute on function public.pn_sheet_on_user() from public, anon, authenticated;

drop trigger if exists pn_sheet_user_insert on auth.users;
create trigger pn_sheet_user_insert
  after insert on auth.users
  for each row execute function public.pn_sheet_on_user();

drop trigger if exists pn_sheet_user_update on auth.users;
create trigger pn_sheet_user_update
  after update of phone_confirmed_at, confirmation_sent_at on auth.users
  for each row execute function public.pn_sheet_on_user();

-- Клиент сохранил или поменял имя
create or replace function public.pn_sheet_on_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.full_name is distinct from old.full_name then
    perform public.pn_sheet_notify(new.id, 'name');
  end if;
  return new;
end;
$$;
revoke execute on function public.pn_sheet_on_profile() from public, anon, authenticated;

drop trigger if exists pn_sheet_profile_update on public.profiles;
create trigger pn_sheet_profile_update
  after update of full_name on public.profiles
  for each row execute function public.pn_sheet_on_profile();

-- Уже существующие клиенты попадут в таблицу при следующем входе. Чтобы добавить их сразу:
-- select public.pn_sheet_notify(id, 'code')
--   from auth.users where coalesce(phone, '') <> '';
