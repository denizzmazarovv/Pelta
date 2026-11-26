/*
  Pelta Nera — уведомление в Telegram-группу о каждом новом клиенте (26.11.2026).
  Запустите целиком: SQL Editor → New query → вставить → Run. Можно запускать повторно.

  - Раз в минуту (pg_cron) база ищет клиентов, которые подтвердили номер, и шлёт каждого
    в группу через бота. Ждём минуту после подтверждения, чтобы клиент успел ввести имя.
  - Если Telegram не принял сообщение, на следующей минуте база пробует снова (до 5 раз).
  - Клиенты, зарегистрированные ДО включения, не присылаются — только новые.
  - Ключ бота и ID группы хранятся только в базе (таблица закрыта для сайта), в коде их нет.
    Записать их (в SQL Editor, НЕ в этот файл):
      insert into public.pn_tg_alerts_config (id, bot_token, chat_id) values (1, 'КЛЮЧ_БОТА', 'ID_ГРУППЫ')
      on conflict (id) do update set bot_token = excluded.bot_token, chat_id = excluded.chat_id;
      select public.pn_tg_alert_test();   -- в группу придёт проверочное сообщение
*/
create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;

-- 1. НАСТРОЙКИ: ключ бота и группа -------------------------------------------------
create table if not exists public.pn_tg_alerts_config (
  id int primary key default 1 check (id = 1),
  bot_token text not null check (bot_token ~ '^[0-9]+:[A-Za-z0-9_-]{30,}$'),
  chat_id text not null check (chat_id ~ '^-?[0-9]+$|^@[A-Za-z0-9_]{5,}$'),
  start_at timestamptz not null default now()
);
alter table public.pn_tg_alerts_config enable row level security;
revoke all on public.pn_tg_alerts_config from public, anon, authenticated;

-- 2. КОГО УЖЕ ПРИСЛАЛИ ----------------------------------------------------------------
create table if not exists public.pn_tg_user_alerts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  request_id bigint,
  attempts int not null default 0,
  ok boolean not null default false,
  sent_at timestamptz not null default now()
);
alter table public.pn_tg_user_alerts enable row level security;
revoke all on public.pn_tg_user_alerts from public, anon, authenticated;

create or replace function public.pn_tg_html(p text)
returns text
language sql
immutable
set search_path = ''
as $$
  select replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;')
$$;

create or replace function public.pn_tg_send(p_text text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.pn_tg_alerts_config;
begin
  select * into c from public.pn_tg_alerts_config where id = 1;
  if not found then
    return null;
  end if;
  return net.http_post(
    url := 'https://api.telegram.org/bot' || c.bot_token || '/sendMessage',
    body := jsonb_build_object('chat_id', c.chat_id, 'text', p_text, 'parse_mode', 'HTML',
                               'disable_web_page_preview', true),
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );
end;
$$;

-- 3. ТЕКСТ СООБЩЕНИЯ О КЛИЕНТЕ ------------------------------------------------------
create or replace function public.pn_tg_user_text(p_user uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  u auth.users;
  p public.profiles;
  v_total bigint;
  v_tg text;
  v_ig text;
begin
  select * into u from auth.users where id = p_user;
  select * into p from public.profiles where id = p_user;
  select count(*) into v_total from auth.users
   where phone_confirmed_at is not null and coalesce(phone, '') <> '';

  v_tg := nullif(btrim(coalesce(p.tg_username, p.telegram, '')), '');
  if v_tg is not null and left(v_tg, 1) <> '@' then v_tg := '@' || v_tg; end if;
  v_ig := nullif(btrim(coalesce(p.instagram, '')), '');
  if v_ig is not null and left(v_ig, 1) <> '@' then v_ig := '@' || v_ig; end if;

  return '🆕 <b>Новый клиент Pelta Nera</b>' || chr(10) || chr(10)
    || '👤 ' || coalesce(public.pn_tg_html(nullif(btrim(p.full_name), '')), '<i>имя не указал</i>') || chr(10)
    || '📞 +' || regexp_replace(u.phone, '[^0-9]', '', 'g') || chr(10)
    || case when v_tg is not null then '✈️ ' || public.pn_tg_html(v_tg) || chr(10) else '' end
    || case when v_ig is not null then '📸 Instagram: ' || public.pn_tg_html(v_ig) || chr(10) else '' end
    || '🕒 ' || to_char(u.phone_confirmed_at at time zone 'Asia/Tashkent', 'DD.MM.YYYY HH24:MI') || chr(10)
    || '👥 Всего клиентов: ' || v_total;
end;
$$;

-- 4. ПРОВЕРКА РАЗ В МИНУТУ ------------------------------------------------------------
create or replace function public.pn_tg_alert_new_users()
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  c public.pn_tg_alerts_config;
  r record;
  v_sent int := 0;
begin
  select * into c from public.pn_tg_alerts_config where id = 1;
  if not found then
    return 0;
  end if;

  -- Что Telegram ответил на прошлые отправки
  update public.pn_tg_user_alerts a
     set ok = true
    from net._http_response h
   where h.id = a.request_id and not a.ok and h.status_code = 200;

  for r in
    select u.id
      from auth.users u
      left join public.pn_tg_user_alerts a on a.user_id = u.id
      left join net._http_response h on h.id = a.request_id
     where u.phone_confirmed_at is not null
       and coalesce(u.phone, '') <> ''
       and u.phone_confirmed_at >= c.start_at
       and u.phone_confirmed_at <= now() - interval '1 minute'
       and (a.user_id is null
            or (not a.ok and a.attempts < 5
                and (h.id is not null or a.sent_at < now() - interval '10 minutes')))
     order by u.phone_confirmed_at
     limit 20
  loop
    insert into public.pn_tg_user_alerts as a (user_id, request_id, attempts, sent_at)
    values (r.id, public.pn_tg_send(public.pn_tg_user_text(r.id)), 1, now())
    on conflict (user_id) do update
      set request_id = excluded.request_id, attempts = a.attempts + 1, sent_at = now();
    v_sent := v_sent + 1;
  end loop;
  return v_sent;
end;
$$;

-- Проверочное сообщение в группу (после записи ключа и ID группы)
create or replace function public.pn_tg_alert_test()
returns bigint
language sql
security definer
set search_path = ''
as $$
  select public.pn_tg_send('✅ Бот подключён. Сюда будут приходить новые клиенты Pelta Nera.')
$$;

revoke execute on function public.pn_tg_send(text) from public, anon, authenticated;
revoke execute on function public.pn_tg_user_text(uuid) from public, anon, authenticated;
revoke execute on function public.pn_tg_alert_new_users() from public, anon, authenticated;
revoke execute on function public.pn_tg_alert_test() from public, anon, authenticated;

-- 5. РАСПИСАНИЕ: каждую минуту ----------------------------------------------------------
select cron.unschedule(jobid) from cron.job where jobname = 'pn-tg-new-users';
select cron.schedule('pn-tg-new-users', '* * * * *', 'select public.pn_tg_alert_new_users()');
