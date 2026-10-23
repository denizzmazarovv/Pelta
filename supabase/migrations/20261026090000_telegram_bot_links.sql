/*
  Pelta Nera — связка «номер телефона → чат с ботом» для кодов входа в Telegram.
  Запустите в SQL Editor → Run. Можно запускать повторно.

  Номер хранится только как HMAC-хеш (64 символа), сами цифры не видны.
  Доступ к таблице — только у серверной функции (service_role); с сайта её не видно.
*/
create table if not exists public.pn_telegram_links (
  phone_hash text primary key check (char_length(phone_hash) = 64),
  chat_id bigint not null,
  linked_at timestamptz not null default now()
);

alter table public.pn_telegram_links enable row level security;
revoke all on public.pn_telegram_links from anon, authenticated;
grant select, insert, update, delete on public.pn_telegram_links to service_role;
-- политик нет: читать и писать может только service_role
