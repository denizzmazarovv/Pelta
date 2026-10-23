/*
  Pelta Nera — вход на сайт через Telegram-бота в одно касание.
  Запустите в SQL Editor → Run. Можно запускать повторно.

  pn_telegram_links.phone_enc — номер в зашифрованном виде (AES-GCM, ключ знает только
  серверная функция). Нужен, чтобы знакомому клиенту не делиться номером повторно.

  pn_login_requests — короткоживущие запросы входа (10 минут, затем удаляются).
  Ключ входа хранится только как хеш; номер и код — только в зашифрованном виде.
  Доступ к обеим таблицам — только у серверной функции (service_role).
*/
alter table public.pn_telegram_links add column if not exists phone_enc text;
create index if not exists pn_telegram_links_chat_idx on public.pn_telegram_links (chat_id, linked_at desc);

create table if not exists public.pn_login_requests (
  nonce_hash text primary key check (char_length(nonce_hash) = 64),
  nonce_enc text not null,
  chat_id bigint not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'claiming', 'done')),
  phone_enc text,
  phone_hash text check (phone_hash is null or char_length(phone_hash) = 64),
  otp_enc text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);
create index if not exists pn_login_requests_chat_idx on public.pn_login_requests (chat_id, created_at desc);
create index if not exists pn_login_requests_claim_idx on public.pn_login_requests (phone_hash) where status = 'claiming';

alter table public.pn_login_requests enable row level security;
revoke all on public.pn_login_requests from anon, authenticated;
grant select, insert, update, delete on public.pn_login_requests to service_role;
-- политик нет: читать и писать может только service_role
