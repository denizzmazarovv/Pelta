/*
  Pelta Nera — вход и регистрация только по номеру телефона (код в Telegram).
  Запустите в SQL Editor → Run. Можно запускать повторно.

  1. profiles: email больше не обязателен, номер телефона берётся из подтверждённого
     номера аккаунта (auth.users.phone) и не может быть изменён с сайта.
  2. pn_otp_requests: журнал отправок кодов для лимитов. Хранит только хеш номера,
     доступ — только у серверной функции (service_role). Записи старше 7 дней удаляются.
  3. pn_otp_allow(): атомарная проверка лимитов перед отправкой кода.
*/

-- 1. Профили ----------------------------------------------------------------
alter table public.profiles alter column email drop not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name  text := nullif(left(btrim(coalesce(new.raw_user_meta_data->>'full_name', '')), 60), '');
  v_phone text := nullif(regexp_replace(coalesce(new.phone, ''), '[^0-9]', '', 'g'), '');
begin
  if v_phone is not null then
    v_phone := '+' || v_phone;
    if v_phone !~ '^\+[0-9]{9,15}$' then v_phone := null; end if;
  end if;

  insert into public.profiles (id, email, full_name, phone, prefs, marketing)
  values (new.id, new.email, v_name, v_phone, '{}', false)
  on conflict (id) do nothing;
  return new;
exception when others then
  begin
    insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  exception when others then null;
  end;
  return new;
end;
$$;

-- Подтверждённый номер (или email) аккаунта всегда копируется в профиль
create or replace function public.sync_profile_contact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.phone is distinct from old.phone or new.email is distinct from old.email then
    update public.profiles
       set phone = case when coalesce(new.phone, '') = '' then null else '+' || regexp_replace(new.phone, '[^0-9]', '', 'g') end,
           email = new.email,
           updated_at = now()
     where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
drop trigger if exists on_auth_user_contact_changed on auth.users;
create trigger on_auth_user_contact_changed
  after update of phone, email on auth.users
  for each row execute function public.sync_profile_contact();

revoke execute on function public.sync_profile_contact() from public, anon, authenticated;

-- С сайта можно менять только имя, интересы и согласие на рассылку. Телефон — нет.
revoke update on public.profiles from authenticated;
revoke update (phone, email, full_name, prefs, marketing) on public.profiles from authenticated;
grant update (full_name, prefs, marketing) on public.profiles to authenticated;

-- 2. Журнал отправок кодов ----------------------------------------------------
create table if not exists public.pn_otp_requests (
  id bigint generated always as identity primary key,
  phone_hash text not null check (char_length(phone_hash) = 64),
  created_at timestamptz not null default now()
);
create index if not exists pn_otp_requests_hash_idx on public.pn_otp_requests (phone_hash, created_at desc);
create index if not exists pn_otp_requests_created_idx on public.pn_otp_requests (created_at desc);

alter table public.pn_otp_requests enable row level security;
revoke all on public.pn_otp_requests from anon, authenticated;
-- политик нет: читать и писать может только service_role (серверная функция)

-- 3. Проверка лимитов ----------------------------------------------------------
create or replace function public.pn_otp_allow(
  p_hash text,
  p_per_hour int default 5,
  p_per_day int default 10,
  p_global_day int default 300
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  n_hour int;
  n_day int;
  n_global int;
begin
  -- один номер обрабатываем строго по очереди
  perform pg_advisory_xact_lock(hashtext(p_hash));

  select count(*) filter (where created_at > now() - interval '1 hour'),
         count(*)
    into n_hour, n_day
    from public.pn_otp_requests
   where phone_hash = p_hash and created_at > now() - interval '1 day';

  if n_hour >= p_per_hour then return 'phone_hour'; end if;
  if n_day >= p_per_day then return 'phone_day'; end if;

  select count(*) into n_global from public.pn_otp_requests where created_at > now() - interval '1 day';
  if n_global >= p_global_day then return 'global_day'; end if;

  insert into public.pn_otp_requests (phone_hash) values (p_hash);
  delete from public.pn_otp_requests where created_at < now() - interval '7 days';
  return 'ok';
end;
$$;

revoke execute on function public.pn_otp_allow(text, int, int, int) from public, anon, authenticated;
grant execute on function public.pn_otp_allow(text, int, int, int) to service_role;
